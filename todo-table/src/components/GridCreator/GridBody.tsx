import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GridCell } from './GridCell';
import { useGridContext } from './GridContextHooks';
import { useSelectionHandling } from './hooks/useSelectionHandling';
import { useFilePaste } from './hooks/useFilePaste';
import { GridTableHeader } from './GridTableHeader';
import { ContextMenu } from './ContextMenu';

interface GridBodyProps {
  onHandleResizeStart: (index: number, e: React.MouseEvent) => void;
  columns: ReturnType<typeof useGridContext>['columns'];
  rows: ReturnType<typeof useGridContext>['rows'];
  baseUrl: string;
  allSelected: boolean;
  onSelectAll: (selected: boolean) => void;
  viewportHeight: number;
  scrollTop: number;
  viewportWidth: number;
  scrollLeft: number;
}

/**
 * 表格主体组件
 */
export const GridBody: React.FC<GridBodyProps> = ({
  onHandleResizeStart,
  columns,
  rows,
  baseUrl,
  allSelected,
  onSelectAll,
  viewportHeight,
  scrollTop,
  viewportWidth,
  scrollLeft,
}) => {
  type CellContextMenuState = {
    show: boolean;
    x: number;
    y: number;
    rowId: string;
    rowIndex: number;
    colIndex: number;
    columnType?: 'text' | 'image' | 'file' | 'vendor' | 'vendorNote' | 'date';
  };

  const {
    toggleRowSelection,
    updateCellContent,
    updateCellStyle,
    uploadCellFile,
    removeCellFile,
    toggleCellSelection,
    clearCellSelection,
    setSelectedCells,
    selectedCells,
    vendors,
    updateColumnTitle,
    deleteColumn,
  } = useGridContext();

  const updateCellContentRef = useRef(updateCellContent);
  const updateCellStyleRef = useRef(updateCellStyle);
  const uploadCellFileRef = useRef(uploadCellFile);
  const removeCellFileRef = useRef(removeCellFile);
  const toggleCellSelectionRef = useRef(toggleCellSelection);

  useEffect(() => {
    updateCellContentRef.current = updateCellContent;
    updateCellStyleRef.current = updateCellStyle;
    uploadCellFileRef.current = uploadCellFile;
    removeCellFileRef.current = removeCellFile;
    toggleCellSelectionRef.current = toggleCellSelection;
  }, [updateCellContent, updateCellStyle, uploadCellFile, removeCellFile, toggleCellSelection]);

  // 使用选择处理Hook
  const {
    isSelecting,
    setIsSelecting,
    setStartCell,
    handleBlankAreaClick
  } = useSelectionHandling(setSelectedCells, clearCellSelection);

  // 使用文件粘贴Hook
  useFilePaste(selectedCells, columns, rows, uploadCellFile);

  const visibleRows = useMemo(
    () =>
      rows.reduce<Array<{ row: (typeof rows)[number]; rowIndex: number }>>((acc, row, rowIndex) => {
        if (!row.hidden) {
          acc.push({ row, rowIndex });
        }
        return acc;
      }, []),
    [rows]
  );

  const fallbackVendors = useMemo(() => {
    if (vendors.length > 0) return [];

    const vendorMap = new Map<string, { id: string; name: string }>();
    for (const row of rows) {
      for (const cell of row.cells) {
        if (cell.type !== 'vendor' || !cell.content) continue;

        try {
          const vendorList = typeof cell.content === 'string'
            ? JSON.parse(cell.content)
            : cell.content;

          if (!Array.isArray(vendorList)) continue;
          for (const item of vendorList) {
            if (!item?.name) continue;
            const key = String(item.name).trim().toLowerCase();
            if (!key) continue;
            vendorMap.set(key, {
              id: item.id || key,
              name: item.name,
            });
          }
        } catch {
          // Ignore broken vendor JSON in individual cells
        }
      }
    }

    return Array.from(vendorMap.values());
  }, [vendors, rows]);

  const existingVendors = useMemo(() => {
    if (vendors.length > 0) {
      return vendors.map(vendor => ({
        id: vendor.vendor_id,
        name: vendor.name,
      }));
    }

    return fallbackVendors;
  }, [vendors, fallbackVendors]);

  const selectedCellSet = useMemo(() => {
    const set = new Set<string>();
    for (const cell of selectedCells) {
      set.add(`${cell.rowIndex}-${cell.columnIndex}`);
    }
    return set;
  }, [selectedCells]);

  const [contextMenuState, setContextMenuState] = useState<CellContextMenuState | null>(null);
  const [pendingUploadType, setPendingUploadType] = useState<'image' | 'file' | null>(null);
  const contextUploadInputRef = useRef<HTMLInputElement>(null);

  const ROW_HEIGHT = 80;
  const OVERSCAN_COUNT = 8;
  const COLUMN_OVERSCAN_PX = 240;
  const safeViewportHeight = viewportHeight || 600;
  const totalHeight = visibleRows.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_COUNT);
  const endIndex = Math.min(
    visibleRows.length,
    Math.ceil((scrollTop + safeViewportHeight) / ROW_HEIGHT) + OVERSCAN_COUNT
  );
  const virtualRows = visibleRows.slice(startIndex, endIndex);

  const columnMetrics = useMemo(() => {
    const starts: number[] = [];
    let runningWidth = 0;
    for (const column of columns) {
      starts.push(runningWidth);
      runningWidth += column.width;
    }
    return { starts, totalWidth: runningWidth };
  }, [columns]);

  const safeViewportWidth = viewportWidth || 1200;
  const rangeStart = Math.max(0, scrollLeft - COLUMN_OVERSCAN_PX);
  const rangeEnd = scrollLeft + safeViewportWidth + COLUMN_OVERSCAN_PX;

  let startColIndex = 0;
  while (
    startColIndex < columns.length &&
    columnMetrics.starts[startColIndex] + columns[startColIndex].width < rangeStart
  ) {
    startColIndex += 1;
  }

  let endColIndex = startColIndex;
  while (
    endColIndex < columns.length &&
    columnMetrics.starts[endColIndex] < rangeEnd
  ) {
    endColIndex += 1;
  }

  const visibleColumns = columns.slice(startColIndex, endColIndex);
  const columnsLeftPadding = columnMetrics.starts[startColIndex] || 0;
  const visibleColumnsWidth = visibleColumns.reduce((sum, column) => sum + column.width, 0);
  const columnsRightPadding = Math.max(0, columnMetrics.totalWidth - columnsLeftPadding - visibleColumnsWidth);

  /**
   * 处理鼠标按下事件，开始选择
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    const cellEl = findCellElement(e.target as HTMLElement);
    if (!cellEl) return;

    const [row, col] = parseCellIndices(cellEl);
    if (row === null || col === null) return;

    setIsSelecting(true);
    setStartCell({ row, col });

    document.body.style.userSelect = "none";
  };

  /**
   * 处理单元格选择
   */
  const handleCellSelect = useCallback((rowIndex: number, colIndex: number, e: React.MouseEvent | React.KeyboardEvent) => {
    if (isSelecting) return;
    
    let shiftKey = false;
    if ('shiftKey' in e && e.shiftKey) {
      shiftKey = true;
    }
    toggleCellSelectionRef.current(rowIndex, colIndex, { shiftKey });
  }, [isSelecting]);

  const handleUpdateCell = useCallback((rowId: string, colIndex: number, content: string) => {
    updateCellContentRef.current(rowId, colIndex, content);
  }, []);

  const handleStyleChangeCell = useCallback((
    rowId: string,
    colIndex: number,
    style: { backgroundColor?: string; textColor?: string }
  ) => {
    updateCellStyleRef.current(rowId, colIndex, style);
  }, []);

  const handleFileUploadCell = useCallback((rowId: string, colIndex: number, file: File) => {
    uploadCellFileRef.current(rowId, colIndex, file);
  }, []);

  const handleFileRemoveCell = useCallback((rowId: string, colIndex: number, fileIndex: number) => {
    removeCellFileRef.current(rowId, colIndex, fileIndex);
  }, []);

  const openContextMenu = useCallback((params: Omit<CellContextMenuState, 'show'>) => {
    setContextMenuState({ show: true, ...params });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenuState(null);
    setPendingUploadType(null);
  }, []);

  const handleContextClearContent = useCallback(() => {
    if (!contextMenuState) return;
    handleUpdateCell(contextMenuState.rowId, contextMenuState.colIndex, '');
    closeContextMenu();
  }, [contextMenuState, handleUpdateCell, closeContextMenu]);

  const handleContextSetTextColor = useCallback((color: string) => {
    if (!contextMenuState) return;
    handleStyleChangeCell(contextMenuState.rowId, contextMenuState.colIndex, { textColor: color });
    closeContextMenu();
  }, [contextMenuState, handleStyleChangeCell, closeContextMenu]);

  const handleContextSetBgColor = useCallback((color: string) => {
    if (!contextMenuState) return;
    handleStyleChangeCell(contextMenuState.rowId, contextMenuState.colIndex, { backgroundColor: color });
    closeContextMenu();
  }, [contextMenuState, handleStyleChangeCell, closeContextMenu]);

  const triggerContextUpload = useCallback((uploadType: 'image' | 'file') => {
    setPendingUploadType(uploadType);
    contextUploadInputRef.current?.click();
    closeContextMenu();
  }, [closeContextMenu]);

  const handleContextUploadImage = useCallback(() => {
    triggerContextUpload('image');
  }, [triggerContextUpload]);

  const handleContextUploadFile = useCallback(() => {
    triggerContextUpload('file');
  }, [triggerContextUpload]);

  const handleContextUploadChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !contextMenuState) return;

    handleFileUploadCell(contextMenuState.rowId, contextMenuState.colIndex, file);
    e.target.value = '';
    setPendingUploadType(null);
  }, [contextMenuState, handleFileUploadCell]);

  /**
   * 根据列样式判断是否可以调整列宽
   */
  const isResizable = (column: typeof columns[0]) => {
    return !(column.style?.fixed === true);
  };

  return (
    <div
      className={`min-w-max ${isSelecting ? 'select-none' : ''}`}
      onClick={handleBlankAreaClick}
      style={{
        width: '100%',
        minHeight: 200,
        userSelect: isSelecting ? 'none' : undefined,
        transform: 'scale(-1)',
      }}
      tabIndex={-1}
      onMouseDown={handleMouseDown}
    >
        <GridTableHeader
          columns={columns}
          allSelected={allSelected}
          onSelectAll={onSelectAll}
          updateColumnTitle={updateColumnTitle}
          deleteColumn={deleteColumn}
        />

      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualRows.map((rowData, virtualOffset) => {
          const virtualIndex = startIndex + virtualOffset;
          const top = virtualIndex * ROW_HEIGHT;
          const { row, rowIndex } = rowData;

          return (
            <div
              key={row.id}
              className="flex hover:bg-gray-50"
              style={{
                position: 'absolute',
                top,
                left: 0,
                right: 0,
                height: ROW_HEIGHT,
              }}
            >
              <div className="w-10 flex-shrink-0 border-r border-b border-gray-200 flex items-center justify-center">
                <div className="h-4 w-4">
                  <input
                    type="checkbox"
                    checked={row.isSelected}
                    onChange={() => toggleRowSelection(row.id)}
                    className="rounded h-4 w-4"
                  />
                </div>
              </div>
              {columnsLeftPadding > 0 && (
                <div
                  className="h-[80px] flex-shrink-0 border-b border-gray-200"
                  style={{ width: columnsLeftPadding }}
                />
              )}
              {visibleColumns.map((column, visibleColOffset) => {
                const colIndex = startColIndex + visibleColOffset;
                return (
                <div
                  key={`${row.id}-${column.id}`}
                  className="h-[80px] border-r border-b border-gray-200 flex-shrink-0 relative"
                  style={{
                    width: column.width,
                    maxWidth: column.style?.maxWidth || undefined
                  }}
                >
                  <GridCell
                    rowId={row.id}
                    cell={row.cells[colIndex]}
                    columnType={column.type}
                    onUpdateCell={handleUpdateCell}
                    onStyleChangeCell={handleStyleChangeCell}
                    onFileUploadCell={handleFileUploadCell}
                    onFileRemoveCell={handleFileRemoveCell}
                    onContextMenuCell={openContextMenu}
                    isSelected={selectedCellSet.has(`${rowIndex}-${colIndex}`)}
                    onSelectCell={handleCellSelect}
                    className="lov-grid-cell"
                    data-row={rowIndex}
                    data-col={colIndex}
                    rowIndex={rowIndex}
                    colIndex={colIndex}
                    baseUrl={baseUrl}
                    existingVendors={existingVendors}
                  />
                  {colIndex < columns.length - 1 && isResizable(column) && (
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 z-10"
                      onMouseDown={(e) => onHandleResizeStart(colIndex, e)}
                    />
                  )}
                </div>
              )})}
              {columnsRightPadding > 0 && (
                <div
                  className="h-[80px] flex-shrink-0 border-b border-gray-200"
                  style={{ width: columnsRightPadding }}
                />
              )}
            </div>
          );
        })}
      </div>
      <input
        ref={contextUploadInputRef}
        type="file"
        accept={pendingUploadType === 'image' ? 'image/*' : undefined}
        onChange={handleContextUploadChange}
        className="hidden"
      />
      {contextMenuState && (
        <ContextMenu
          show={contextMenuState.show}
          x={contextMenuState.x}
          y={contextMenuState.y}
          onClose={closeContextMenu}
          onClearContent={handleContextClearContent}
          onSetTextColor={handleContextSetTextColor}
          onSetBgColor={handleContextSetBgColor}
          onUploadImage={contextMenuState.columnType === 'image' ? handleContextUploadImage : undefined}
          onUploadFile={contextMenuState.columnType === 'file' ? handleContextUploadFile : undefined}
          columnType={contextMenuState.columnType}
        />
      )}
    </div>
  );
};

// 工具函数
const findCellElement = (el: HTMLElement | null): HTMLElement | null => {
  while (el) {
    if (el.classList && el.classList.contains('lov-grid-cell')) return el;
    el = el.parentElement;
  }
  return null;
};

const parseCellIndices = (cellEl: HTMLElement): [number | null, number | null] => {
  const row = cellEl.getAttribute('data-row');
  const col = cellEl.getAttribute('data-col');
  if (row != null && col != null) return [parseInt(row, 10), parseInt(col, 10)];
  return [null, null];
};
