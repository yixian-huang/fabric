import React, { useCallback, useState } from "react";
import { GridToolbar } from "./GridToolbar";
import { HiddenRowsDialog } from "./HiddenRowsDialog";

interface GridHeaderProps {
  onAddColumn: () => void;
  onShareClick: () => void;
  onViewLinksClick: () => Promise<void>;
  onViewVendorLinksClick: () => Promise<void>;
  isLoadingLinks?: boolean;
  isLoadingVendorLinks?: boolean;
  projectName?: string;
  createdAt?: string;
}

const GridHeaderComponent: React.FC<GridHeaderProps> = ({
  onAddColumn,
  onShareClick,
  onViewLinksClick,
  onViewVendorLinksClick,
  isLoadingLinks,
  isLoadingVendorLinks,
  projectName,
  createdAt,
}) => {
  const [isHiddenRowsDialogOpen, setIsHiddenRowsDialogOpen] = useState(false);
  const handleShowHiddenRowsClick = useCallback(() => {
    setIsHiddenRowsDialogOpen(true);
  }, []);

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <GridToolbar
        onAddColumn={onAddColumn}
        onShareClick={onShareClick}
        onViewLinksClick={onViewLinksClick}
        onViewVendorLinksClick={onViewVendorLinksClick}
        isLoadingLinks={isLoadingLinks}
        isLoadingVendorLinks={isLoadingVendorLinks}
        projectName={projectName}
        createdAt={createdAt}
        onShowHiddenRowsClick={handleShowHiddenRowsClick}
      />
      <HiddenRowsDialog
        open={isHiddenRowsDialogOpen}
        onOpenChange={setIsHiddenRowsDialogOpen}
      />
    </div>
  );
};

export const GridHeader = React.memo(GridHeaderComponent, (prev, next) => {
  return (
    prev.onAddColumn === next.onAddColumn &&
    prev.onShareClick === next.onShareClick &&
    prev.onViewLinksClick === next.onViewLinksClick &&
    prev.onViewVendorLinksClick === next.onViewVendorLinksClick &&
    prev.isLoadingLinks === next.isLoadingLinks &&
    prev.isLoadingVendorLinks === next.isLoadingVendorLinks &&
    prev.projectName === next.projectName &&
    prev.createdAt === next.createdAt
  );
});
