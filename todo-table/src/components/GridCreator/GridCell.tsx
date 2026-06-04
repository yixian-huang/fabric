import React, { Suspense, useState, useCallback, useMemo } from 'react';
import type { Cell } from './GridTypes';
import { TextCellContent } from './TextCellContent';
import { ImageCellContent } from './ImageCellContent';
import { FileCellContent } from './FileCellContent';
import { DateCellContent } from './DateCellContent';
import type { VendorTag } from './GridTypes';
import { useGridContext } from './GridContextHooks';

const VendorCellContent = React.lazy(async () => {
  const mod = await import('./VendorCellContent');
  return { default: mod.VendorCellContent };
});

const VendorNoteCellContent = React.lazy(async () => {
  const mod = await import('./VendorNoteCellContent');
  return { default: mod.VendorNoteCellContent };
});

interface GridCellProps {
  rowId: string;
  cell: Cell;
  columnType?: 'text' | 'image' | 'file' | 'vendor' | 'vendorNote' | 'date';
  onUpdateCell: (rowId: string, colIndex: number, content: string) => void;
  onStyleChangeCell: (rowId: string, colIndex: number, style: { backgroundColor?: string; textColor?: string }) => void;
  onFileUploadCell: (rowId: string, colIndex: number, file: File) => void;
  onFileRemoveCell: (rowId: string, colIndex: number, fileIndex: number) => void;
  onContextMenuCell: (params: {
    rowId: string;
    rowIndex: number;
    colIndex: number;
    columnType?: 'text' | 'image' | 'file' | 'vendor' | 'vendorNote' | 'date';
    x: number;
    y: number;
  }) => void;
  style?: React.CSSProperties;
  isSelected: boolean;
  onSelectCell: (rowIndex: number, colIndex: number, e: React.MouseEvent | React.KeyboardEvent) => void;
  className?: string;
  rowIndex: number;
  colIndex: number;
  baseUrl: string;
  existingVendors?: VendorTag[];
  'data-row'?: number;
  'data-col'?: number;
}

/**
 * 网格单元格组件
 * 根据列类型渲染不同的单元格内容
 */
const GridCellComponent: React.FC<GridCellProps> = ({
  rowId,
  cell,
  columnType = 'text',
  onUpdateCell,
  onStyleChangeCell,
  onFileUploadCell,
  onFileRemoveCell,
  onContextMenuCell,
  style,
  isSelected,
  onSelectCell,
  className = '',
  rowIndex,
  colIndex,
  baseUrl,
  existingVendors = [],
  'data-row': dataRow,
  'data-col': dataCol,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const { isUploading } = useGridContext();

  const cellStyle = useMemo<React.CSSProperties>(() => ({
    ...style,
    backgroundColor: cell.style?.backgroundColor || 'transparent',
    color: cell.style?.textColor || 'inherit',
    width: '100%',
    height: '100%',
    padding: '0.3rem',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: columnType === 'text' ? 'flex-start' : 'center',
    position: 'relative',
    cursor: 'pointer',
    borderRadius: isSelected ? 1 : undefined,
    outline: isSelected ? '1px solid #409eff' : 'none'
  }), [style, cell.style?.backgroundColor, cell.style?.textColor, columnType, isSelected]);

  const handleUpdate = useCallback(
    (content: string) => onUpdateCell(rowId, colIndex, content),
    [onUpdateCell, rowId, colIndex]
  );

  const handleStyleChange = useCallback(
    (nextStyle: { backgroundColor?: string; textColor?: string }) =>
      onStyleChangeCell(rowId, colIndex, nextStyle),
    [onStyleChangeCell, rowId, colIndex]
  );

  const renderContent = () => {
    if (columnType === 'text') {
      return (
        <TextCellContent
          cell={cell}
          isSelected={isSelected}
          onUpdate={handleUpdate}
        />
      );
    }
    if (columnType === 'date') {
      return (
        <DateCellContent
          cell={cell}
          onUpdate={handleUpdate}
        />
      );
    }
    if (columnType === 'vendorNote') {
      return (
        <Suspense fallback={<div className="w-full h-full" />}>
          <VendorNoteCellContent
            cell={cell}
            rowIndex={rowIndex}
            onUpdate={(notes) => handleUpdate(JSON.stringify(notes))}
          />
        </Suspense>
      );
    }
    if (columnType === 'vendor') {
      return (
        <Suspense fallback={<div className="w-full h-full" />}>
          <VendorCellContent
            cell={cell}
            onUpdate={(vendors: VendorTag[]) => handleUpdate(JSON.stringify(vendors))}
            isEditing={isEditing}
            onEditingChange={setIsEditing}
            existingVendors={existingVendors}
          />
        </Suspense>
      );
    }
    if (columnType === 'image') {
      return (
        <ImageCellContent
          cell={cell}
          baseUrl={baseUrl}
          onFileUpload={(file) => onFileUploadCell(rowId, colIndex, file)}
        />
      );
    }
    if (columnType === 'file') {
      const rowId = cell.row; // 从单元格ID中提取行ID
      return (
        <FileCellContent
          cell={cell}
          onFileUpload={(file) => onFileUploadCell(rowId, colIndex, file)}
          onFileRemove={(fileIndex) => onFileRemoveCell(rowId, colIndex, fileIndex)}
          isUploading={isUploading(rowId, colIndex)}
        />
      );
    }
    return <div className="w-full whitespace-pre-line break-words">{typeof cell.content === "string" ? cell.content : ""}</div>;
  };

  const handleCellClick = (e: React.MouseEvent) => {
    onSelectCell(rowIndex, colIndex, e);
  };
  
  // 右键时交给 GridBody 的单例菜单处理
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onSelectCell(rowIndex, colIndex, e);
    onContextMenuCell({
      rowId,
      rowIndex,
      colIndex,
      columnType,
      x: e.clientX,
      y: e.clientY,
    });
  }, [onSelectCell, onContextMenuCell, rowId, rowIndex, colIndex, columnType]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 触发单元格选择
    if (e.key === " " || e.key === "Enter") {
      onSelectCell(rowIndex, colIndex, e);
    }

    // Ctrl+B: 切换文字颜色（黑色/红色）
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      handleStyleChange({
        textColor: cell.style?.textColor === '#ea384c' ? 'inherit' : '#ea384c' 
      });
    }
    
    // Ctrl+H: 切换背景色（透明/黄色）
    if (e.ctrlKey && e.key === 'h') {
      e.preventDefault();
      handleStyleChange({
        backgroundColor: cell.style?.backgroundColor === '#FECA2B' ? 'transparent' : '#FECA2B' 
      });
    }
  };

  return (
    <>
      <div
        className={`relative min-h-[40px] user-select-none ${className}`}
        style={cellStyle}
        onClick={handleCellClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-selected={isSelected}
        data-row={dataRow}
        data-col={dataCol}
      >
        {renderContent()}
      </div>
    </>
  );
};

export const GridCell = React.memo(GridCellComponent, (prev, next) => {
  return (
    prev.rowId === next.rowId &&
    prev.cell === next.cell &&
    prev.columnType === next.columnType &&
    prev.isSelected === next.isSelected &&
    prev.rowIndex === next.rowIndex &&
    prev.colIndex === next.colIndex &&
    prev.baseUrl === next.baseUrl &&
    prev.existingVendors === next.existingVendors &&
    prev.className === next.className &&
    prev['data-row'] === next['data-row'] &&
    prev['data-col'] === next['data-col']
  );
});
