package fabrics

import (
	"context"
	"sort"
	"strings"
	"time"
)

const (
	defaultPage     = 1
	defaultPageSize = 10
	maxPageSize     = 100
	filterBatchSize = 64
	visitDedupTTL   = 10 * time.Minute
)

type Service struct {
	store  *pgStore
	vendor *pgVendorRepo
}

func NewService(store *pgStore, vendor *pgVendorRepo) *Service {
	return &Service{store: store, vendor: vendor}
}

func (s *Service) List(q ListQuery, userID string) ListResult {
	return s.listInternal(context.Background(), q, userID)
}

func (s *Service) ListPublic(q ListQuery) ListResult {
	return s.listInternal(context.Background(), q, "")
}

func (s *Service) listInternal(ctx context.Context, q ListQuery, userID string) ListResult {
	page, pageSize := normalizePagination(q.Page, q.PageSize)

	fabrics, err := s.store.ListFabrics(ctx)
	if err != nil {
		return ListResult{Page: page, PageSize: pageSize}
	}

	favoriteSet := make(map[string]struct{})
	if userID != "" {
		favoriteSet, _ = s.store.FavoriteSet(ctx, userID)
	}

	filtered := s.batchFilterFabrics(fabrics, q)
	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].CreatedAt.After(filtered[j].CreatedAt)
	})

	total := len(filtered)
	start := (page - 1) * pageSize
	if start > total {
		start = total
	}
	end := start + pageSize
	if end > total {
		end = total
	}

	items := make([]Fabric, 0, end-start)
	for _, f := range filtered[start:end] {
		_, fav := favoriteSet[f.FabricID]
		f.IsFavorited = fav
		items = append(items, f)
	}

	return ListResult{
		Items:    items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}
}

func (s *Service) batchFilterFabrics(fabrics []Fabric, q ListQuery) []Fabric {
	out := make([]Fabric, 0, len(fabrics))
	for i := 0; i < len(fabrics); i += filterBatchSize {
		end := i + filterBatchSize
		if end > len(fabrics) {
			end = len(fabrics)
		}
		batch := fabrics[i:end]
		for _, f := range batch {
			if matchesFabric(f, q) {
				out = append(out, f)
			}
		}
	}
	return out
}

func (s *Service) GetOptions(category string) []Option {
	opts, err := s.store.ListOptions(context.Background(), category)
	if err != nil {
		return []Option{}
	}
	return opts
}

func (s *Service) CheckFabricCode(code string) bool {
	ok, err := s.store.FabricCodeExists(context.Background(), code)
	return err == nil && ok
}

func (s *Service) ToggleFavorite(userID, fabricID string) (bool, bool) {
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(fabricID) == "" {
		return false, false
	}
	ok, fav, err := s.store.ToggleFavorite(context.Background(), userID, fabricID)
	if err != nil {
		return false, false
	}
	return ok, fav
}

func (s *Service) RecordVisit(ip, userAgent, page string, now time.Time) bool {
	recorded, err := s.store.RecordVisit(context.Background(), ip, userAgent, page, now)
	return err == nil && recorded
}

func (s *Service) VisitorStats(now time.Time) VisitorStats {
	stats, err := s.store.VisitorStats(context.Background(), now)
	if err != nil {
		return VisitorStats{}
	}
	return stats
}

func normalizePagination(page, pageSize int) (int, int) {
	if page <= 0 {
		page = defaultPage
	}
	if pageSize <= 0 {
		pageSize = defaultPageSize
	}
	if pageSize > maxPageSize {
		pageSize = maxPageSize
	}
	return page, pageSize
}

func matchesFabric(f Fabric, q ListQuery) bool {
	if q.ReferenceCode != "" && !containsFold(f.ReferenceCode, q.ReferenceCode) {
		return false
	}
	if q.FabricCode != "" && !containsFold(f.Code, q.FabricCode) {
		return false
	}
	if q.FabricType != "" && !strings.EqualFold(f.FabricType, q.FabricType) {
		return false
	}
	if q.WeightUnit != "" && !strings.EqualFold(f.WeightUnit, q.WeightUnit) {
		return false
	}
	if q.WeightMin != nil && f.Weight < *q.WeightMin {
		return false
	}
	if q.WeightMax != nil && f.Weight > *q.WeightMax {
		return false
	}
	if len(q.StyleCodes) > 0 {
		if q.StyleEnabledOR {
			if !sliceContainsAny(f.StyleCodes, q.StyleCodes) {
				return false
			}
		} else if !sliceContainsAll(f.StyleCodes, q.StyleCodes) {
			return false
		}
	}
	if len(q.ProcessCodes) > 0 {
		if q.ProcessEnabledOR {
			if !sliceContainsAny(f.ProcessCodes, q.ProcessCodes) {
				return false
			}
		} else if !sliceContainsAll(f.ProcessCodes, q.ProcessCodes) {
			return false
		}
	}
	if q.ComponentCode != "" || q.ComponentPercentageMin != nil || q.ComponentPercentageMax != nil {
		match := false
		for _, c := range f.Components {
			if q.ComponentCode != "" && !containsFold(c.OptionCode, q.ComponentCode) {
				continue
			}
			if q.ComponentPercentageMin != nil && c.Percentage < *q.ComponentPercentageMin {
				continue
			}
			if q.ComponentPercentageMax != nil && c.Percentage > *q.ComponentPercentageMax {
				continue
			}
			match = true
			break
		}
		if !match {
			return false
		}
	}
	return true
}

func containsFold(s, sub string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(sub))
}

func sliceContainsAny(haystack, needles []string) bool {
	set := toFoldSet(haystack)
	for _, n := range needles {
		if _, ok := set[strings.ToLower(strings.TrimSpace(n))]; ok {
			return true
		}
	}
	return false
}

func sliceContainsAll(haystack, needles []string) bool {
	set := toFoldSet(haystack)
	for _, n := range needles {
		if _, ok := set[strings.ToLower(strings.TrimSpace(n))]; !ok {
			return false
		}
	}
	return true
}

func toFoldSet(items []string) map[string]struct{} {
	set := make(map[string]struct{}, len(items))
	for _, it := range items {
		set[strings.ToLower(strings.TrimSpace(it))] = struct{}{}
	}
	return set
}

func (s *Service) ListVendors(ctx context.Context) ([]Vendor, error) {
	if s.vendor == nil {
		return []Vendor{}, nil
	}
	return s.vendor.List(ctx)
}

func (s *Service) CreateVendor(ctx context.Context, v Vendor) (Vendor, error) {
	return s.vendor.Create(ctx, v)
}

func (s *Service) GetVendor(ctx context.Context, id string) (Vendor, error) {
	return s.vendor.Get(ctx, id)
}

func (s *Service) UpdateVendor(ctx context.Context, id string, v Vendor) (Vendor, error) {
	return s.vendor.Update(ctx, id, v)
}

func (s *Service) DeleteVendor(ctx context.Context, id string) error {
	return s.vendor.Delete(ctx, id)
}

func (s *Service) GetFabric(fabricID, userID string) (Fabric, error) {
	f, err := s.store.GetFabric(context.Background(), fabricID)
	if err != nil {
		return Fabric{}, err
	}
	if userID != "" {
		if favs, err := s.store.FavoriteSet(context.Background(), userID); err == nil {
			_, f.IsFavorited = favs[fabricID]
		}
	}
	return f, nil
}

func (s *Service) CreateFabric(in FabricInput) (Fabric, error) {
	return s.store.CreateFabric(context.Background(), in)
}

func (s *Service) UpdateFabric(fabricID string, in FabricInput) (Fabric, error) {
	return s.store.UpdateFabric(context.Background(), fabricID, in)
}

func (s *Service) DeleteFabric(fabricID string) error {
	return s.store.DeleteFabric(context.Background(), fabricID)
}

func (s *Service) CreateOption(in OptionInput) (Option, error) {
	return s.store.CreateOption(context.Background(), in)
}

func (s *Service) UpdateOption(optionID string, name *string, sortOrder *int) (Option, error) {
	return s.store.UpdateOption(context.Background(), optionID, name, sortOrder)
}

func (s *Service) DeleteOption(optionID string) error {
	return s.store.DeleteOption(context.Background(), optionID)
}

func (s *Service) MyFavorites(userID string) ([]FavoriteItem, error) {
	return s.store.ListFavorites(context.Background(), userID)
}

func (s *Service) ShareFavorites(userID string) (FavoriteShareDTO, error) {
	return s.store.GetOrCreateFavoriteShare(context.Background(), userID)
}

func (s *Service) SharedFavorites(token string) ([]FavoriteItem, error) {
	items, _, err := s.store.ListSharedFavorites(context.Background(), token)
	return items, err
}
