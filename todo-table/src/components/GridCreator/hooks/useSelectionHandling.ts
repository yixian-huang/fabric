
import { useState, useEffect } from 'react';
import { CellPos } from '../GridTypes';

/**
 * 处理单元格选择的自定义Hook
 * @returns 选择相关的状态和处理方法
 */
export const useSelectionHandling = (
  setSelectedCells: (cells: CellPos[]) => void,
  clearCellSelection: () => void
) => {
  // 选择状态
  const [isSelecting, setIsSelecting] = useState(false);
  const [startCell, setStartCell] = useState<{ row: number; col: number } | null>(null);
  const [endCell, setEndCell] = useState<{ row: number; col: number } | null>(null);

  /**
   * 处理鼠标移动事件
   */
  const handleMouseMove = (e: MouseEvent) => {
    if (!isSelecting || startCell == null) return;

    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    const cellEl = findCellElement(el);
    if (!cellEl) return;
    
    const [row, col] = parseCellIndices(cellEl);
    if (row === null || col === null) return;

    setEndCell({ row, col });
  };

  /**
   * 处理鼠标抬起事件
   */
  const handleMouseUp = () => {
    if (!isSelecting || !startCell || !endCell) return;

    const r1 = Math.min(startCell.row, endCell.row);
    const r2 = Math.max(startCell.row, endCell.row);
    const c1 = Math.min(startCell.col, endCell.col);
    const c2 = Math.max(startCell.col, endCell.col);
    
    const cells: CellPos[] = [];
    for (let row = r1; row <= r2; row++) {
      for (let col = c1; col <= c2; col++) {
        cells.push({ rowIndex: row, columnIndex: col });
      }
    }
    setSelectedCells(cells);

    setIsSelecting(false);
    setStartCell(null);
    setEndCell(null);

    document.body.style.userSelect = '';
  };

  /**
   * 处理空白区域点击事件
   */
  const handleBlankAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    let el = e.target as HTMLElement | null;

    let isToolbarArea = false;
    let tempEl = el;
    while (tempEl) {
      if (tempEl.classList && isToolbarElement(tempEl)) {
        isToolbarArea = true;
        break;
      }
      tempEl = tempEl.parentElement;
    }
    
    if (isToolbarArea) return;
    
    while (el) {
      if (el.classList && (isCellElement(el) || isColorPickerElement(el))) {
        return;
      }
      el = el.parentElement;
    }
    
    clearCellSelection();
  };

  useEffect(() => {
    if (isSelecting) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isSelecting, startCell, endCell]);

  return {
    isSelecting,
    setIsSelecting,
    setStartCell,
    handleBlankAreaClick
  };
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

const isToolbarElement = (el: HTMLElement): boolean => {
  return el.classList.contains('grid-toolbar') ||
         el.classList.contains('toolbar-controls') ||
         el.classList.contains('toolbar-actions') ||
         el.classList.contains('toolbar-font-colors') ||
         el.classList.contains('toolbar-bg-colors') ||
         el.classList.contains('toolbar-separator') ||
         el.classList.contains('toolbar-clear-btn') ||
         el.classList.contains('toolbar-share-btn') ||
         el.classList.contains('toolbar-add-btn') ||
         el.classList.contains('toolbar-color-btn');
};

const isCellElement = (el: HTMLElement): boolean => {
  return el.classList.contains('lov-grid-cell');
};

const isColorPickerElement = (el: HTMLElement): boolean => {
  return el.classList.contains('color-picker-popover') ||
         el.classList.contains('color-picker-button') ||
         el.classList.contains('color-picker-content') ||
         el.classList.contains('color-picker-label') ||
         el.classList.contains('color-picker-value') ||
         el.classList.contains('color-picker-text') ||
         el.classList.contains('react-colorful') ||
         el.getAttribute('role') === 'dialog' ||
         el.getAttribute('data-radix-popper-content-wrapper') !== null ||
         el.classList.contains('text-muted-foreground') ||
         el.classList.contains('bg-[#999]') ||
         el.classList.contains('border-[#999]') ||
         el.classList.contains('border-transparent');
};
