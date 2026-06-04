import React, { useState } from "react";
import { Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGridContext } from "./GridContextHooks";
import { EyeOutlined, EyeInvisibleOutlined, UsergroupAddOutlined } from "@ant-design/icons";

const FONT_COLORS = [
  { color: "#000000e6", label: "黑色" },
  { color: "#ea384c", label: "红色" },
  { color: "#1EAEDB", label: "蓝色" },
  { color: "#3FD048", label: "绿色" },
  { color: "#FECA2B", label: "黄色" },
  { color: "#9b87f5", label: "紫色" },
];

const BG_COLORS = [
  { color: "#FFDEE2" },
  { color: "#D3E4FD" },
  { color: "#F2FCE2" },
  { color: "#FDFDDE" },
  { color: "#FEF7CD" },
  { color: "#F5EDFF" },
];

interface GridToolbarProps {
  onAddColumn: () => void;
  onShareClick: () => void;
  onViewLinksClick: () => Promise<void>;
  onViewVendorLinksClick: () => Promise<void>;
  onShowHiddenRowsClick: () => void;
  isLoadingLinks?: boolean;
  isLoadingVendorLinks?: boolean;
  projectName?: string;
  createdAt?: string;
}

export const GridToolbar: React.FC<GridToolbarProps> = ({
  onAddColumn,
  onShareClick,
  onViewLinksClick,
  onViewVendorLinksClick,
  onShowHiddenRowsClick,
  isLoadingLinks = false,
  isLoadingVendorLinks = false,
  projectName,
  createdAt,
}) => {
  const {
    applyStyleToSelectedCells,
    clearAllCellStyle,
    selectedCells,
    hideSelectedRows,
    selectedRowsCount,
    rows,
  } = useGridContext();

  const [selectedFontColor, setSelectedFontColor] = useState(FONT_COLORS[0].color);
  const [selectedBgColor, setSelectedBgColor] = useState<string>();
  const [isHiddenRowsDialogOpen, setIsHiddenRowsDialogOpen] = useState(false);
  
  const displayDate = createdAt ? new Date(createdAt).toISOString().split('T')[0] : (() => {
    const now = new Date();
    return [
      now.getFullYear(),
      (now.getMonth() + 1).toString().padStart(2, "0"),
      now.getDate().toString().padStart(2, "0"),
    ].join("-");
  })();

  const handleFontColorClick = (col: string) => {
    setSelectedFontColor(col);
    applyStyleToSelectedCells({ textColor: col });
  };
  const handleBgColorClick = (col: string) => {
    setSelectedBgColor(col);
    applyStyleToSelectedCells({ backgroundColor: col });
  };
  const handleClearFormat = () => {
    setSelectedFontColor(FONT_COLORS[0].color);
    setSelectedBgColor(undefined);
    clearAllCellStyle();
  };


  return (
    <div className="flex items-center pt-5 pb-3 px-4 border-b border-gray-200 bg-white grid-toolbar">
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        <div className="text-2xl font-bold text-[#222] truncate">
          {projectName || "TODO-TABLE"}
        </div>
        <span>
          <span className="inline-flex items-center rounded-full bg-[#D3E4FD] text-[#5F7FC8] px-3 py-0.5 text-sm font-medium">
            <Calendar size={16} className="inline-block mr-1.5" />
            {displayDate}
          </span>
        </span>
        <div className="flex items-center ml-4 space-x-3 flex-shrink-0 toolbar-controls">
          {/* <div className="flex items-center toolbar-font-colors">
            <span className="mr-2 text-muted-foreground toolbar-label">文字颜色</span>
            {FONT_COLORS.map((fc) => (
              <button
                key={fc.color}
                className={`w-5 h-5 rounded-full border-2 mx-[2px] toolbar-color-btn ${selectedFontColor === fc.color ? "border-[#999]" : "border-transparent"}`}
                style={{ background: fc.color }}
                aria-label={fc.label}
                onClick={() => handleFontColorClick(fc.color)}
                type="button"
                disabled={!selectedCells.length}
              />
            ))}
          </div>
          <div className="px-3 text-muted-foreground font-normal toolbar-separator">|</div>
          <div className="flex items-center toolbar-bg-colors">
            <span className="mr-2 text-muted-foreground toolbar-label">背景颜色</span>
            {BG_COLORS.map((bc, i) => (
              <button
                key={bc.color}
                className={`w-5 h-5 rounded-full border-2 mx-[2px] toolbar-color-btn ${selectedBgColor === bc.color ? "border-[#999]" : "border-transparent"}`}
                style={{ background: bc.color }}
                aria-label="背景色"
                onClick={() => handleBgColorClick(bc.color)}
                type="button"
                disabled={!selectedCells.length}
              />
            ))}
          </div>
          <div className="px-3 text-muted-foreground font-normal toolbar-separator">|</div> */}
          <button
            className="ml-2 text-muted-foreground hover:text-[#ea384c] flex items-center text-sm toolbar-clear-btn"
            aria-label="清除格式"
            type="button"
            onClick={handleClearFormat}
            disabled={!selectedCells.length}
          >
            × 清除格式
          </button>
        </div>
      </div>
      <div className="flex items-center space-x-2 ml-auto toolbar-actions">
        {selectedRowsCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={hideSelectedRows}
            className="flex items-center toolbar-hide-rows-btn"
          >
            <EyeInvisibleOutlined className="w-4 h-4 mr-1" />
            隐藏选中行
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onShowHiddenRowsClick}
          className="flex items-center toolbar-show-rows-btn"
        >
          <EyeOutlined className="w-4 h-4 mr-1" />
          显示隐藏行
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onViewVendorLinksClick}
          className="flex items-center toolbar-view-vendor-links-btn"
          disabled={isLoadingVendorLinks}
        >
          {isLoadingVendorLinks ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              加载中...
            </>
          ) : (
            <>
              <UsergroupAddOutlined className="w-4 h-4 mr-1" />
              供应商链接
            </>
          )}
        </Button>
      </div>

    </div>
  );
};
