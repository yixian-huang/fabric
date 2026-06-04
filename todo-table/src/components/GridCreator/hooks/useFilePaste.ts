
import { useEffect } from 'react';
import { CellPos } from '../GridTypes';
import { GridColumn, GridRow } from '../GridTypes';

/**
 * 处理文件粘贴的自定义Hook
 */
export const useFilePaste = (
  selectedCells: CellPos[],
  columns: GridColumn[],
  rows: GridRow[],
  handleFileUpload: (rowId: string, colIndex: number, file: File) => void
) => {
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const selectedImageCells = selectedCells.filter(pos => {
        const column = columns[pos.columnIndex];
        return column.type === 'image';
      });

      if (selectedImageCells.length === 0) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (!file) continue;

          selectedImageCells.forEach(cell => {
            const row = rows[cell.rowIndex];
            if (row) {
              handleFileUpload(row.id, cell.columnIndex, file);
            }
          });
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [selectedCells, columns, rows]);
};
