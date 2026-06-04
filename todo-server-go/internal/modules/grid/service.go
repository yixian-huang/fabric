package grid

type Service interface {
	GetProjectDetail(userID, projectID string) (ProjectDetail, error)
	ListProjects(userID string) ([]ProjectSummary, error)
	CreateProject(userID, name, description string) (ProjectSummary, error)
	UpdateProject(userID, projectID string, patch UpdateProjectRequest) (ProjectSummary, error)
	DeleteProject(userID, projectID string) error
	GetOrCreateTodoProject(userID string) (ProjectDetail, error)
	GetRows(userID, projectID string, hidden bool) ([]RowDTO, error)
	CreateRow(userID, projectID string) (RowDTO, error)
	DeleteRow(userID, rowID string) error
	ToggleRowsHidden(userID string, rowIDs []string, hidden bool) (int, error)
	UpsertCell(userID string, req UpdateCellRequest) (CellDTO, error)
	UpdateColumn(userID, columnID string, patch UpdateColumnRequest) (ColumnDTO, error)
	CreateColumn(userID string, req CreateColumnRequest) (ColumnDTO, error)
	DeleteColumn(userID, columnID string) error

	ListSharedLinks(userID, projectID string) ([]SharedLinkDTO, error)
	CreateSharedLinks(userID string, req CreateSharedRequest) ([]SharedLinkDTO, error)
	DeleteSharedLink(userID, sharedID string) error
	AccessSharedLink(sharedID, sharedKey, password string) (SharedAccessResponse, error)
	AccessSharedProject(sharedKey, password string) (SharedAccessResponse, error)
	UpdateSharedVendorRemark(req UpdateVendorRemarkRequest) error

	ListVendorShares(userID, projectID string) ([]VendorShareDetailDTO, error)
	CreateVendorShare(userID string, req CreateVendorShareRequest) (VendorShareDetailDTO, error)
	DeleteVendorShare(userID, vendorShareID string) error
	GenerateVendorLinks(userID, projectID string) ([]VendorShareDetailDTO, error)
	AccessVendorShareStandard(sharedKey, password string) (SharedAccessResponse, error)
	AccessVendorShareByVendor(sharedKey, password string) (SharedAccessResponse, error)
	UpdateVendorShareRemark(req UpdateVendorRemarkRequest) error
}
