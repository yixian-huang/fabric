import React from 'react';
import { Button } from '@/components/ui/button';
import { useGridContext } from './GridContextHooks';
import { Loader2 } from 'lucide-react';

interface GridFooterProps {
  onShareClick: () => void;
}

export const GridFooter: React.FC<GridFooterProps> = ({ onShareClick }) => {
  const {
    addRow,
    deleteSelectedRows,
    selectedRowsCount,
    rows,
    loading,
  } = useGridContext();

  return (
    <div className="border-t border-gray-200 p-2 bg-gray-50 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          onClick={addRow}
          className="flex items-center"
        >
          {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : (
            <svg className="w-4 h-4 mr-1" xmlns="..." />
          )}
          添加行
        </Button>
        <Button
          variant="outline"
          onClick={deleteSelectedRows}
          disabled={selectedRowsCount === 0}
          className="flex items-center"
        >
          <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
          </svg>
          删除已选择行 ({selectedRowsCount})
        </Button>
      </div>
      <div className="text-sm text-gray-500">
        总计 {rows.length} 行
      </div>
    </div>
  );
};
