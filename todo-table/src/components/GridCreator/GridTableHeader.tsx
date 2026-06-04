import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GridColumn } from "./GridContextTypes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface GridTableHeaderProps {
  columns: GridColumn[];
  allSelected: boolean;
  onSelectAll: (selected: boolean) => void;
  updateColumnTitle: (columnId: string, title: string) => void;
  deleteColumn: (columnId: string) => void;
}

const GridTableHeaderComponent: React.FC<GridTableHeaderProps> = ({
  columns,
  allSelected,
  onSelectAll,
  updateColumnTitle,
  deleteColumn,
}) => {
  const [editColumnId, setEditColumnId] = useState<string | null>(null);
  const [columnTitle, setColumnTitle] = useState<string>("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);

  const handleColumnDoubleClick = (column: GridColumn) => {
    setEditColumnId(column.id);
    setColumnTitle(column.title);
  };

  const handleColumnTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setColumnTitle(e.target.value);
  };

  const handleColumnTitleBlur = () => {
    if (editColumnId) {
      updateColumnTitle(editColumnId, columnTitle);
      setEditColumnId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleColumnTitleBlur();
    } else if (e.key === "Escape") {
      setEditColumnId(null);
    }
  };

  const handleDeleteClick = (columnId: string) => {
    setColumnToDelete(columnId);
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (columnToDelete) {
      deleteColumn(columnToDelete);
      setColumnToDelete(null);
    }
    setConfirmDialogOpen(false);
  };

  return (
    <>
      <div className="flex border-b border-gray-200">
        <div className="w-10 flex-shrink-0 flex items-center justify-center p-2">
          <Checkbox checked={allSelected} onCheckedChange={onSelectAll} />
        </div>
        {columns.map((column) => (
          <div
            key={column.id}
            className="border-r border-gray-200 bg-gray-50 flex-shrink-0 relative"
            style={{ width: column.width }}
          >
            <div
              className="flex items-center justify-between p-2 h-10 bg-green-500 border-1 border border-black" 
              onDoubleClick={() => handleColumnDoubleClick(column)}
            >
              {editColumnId === column.id ? (
                <Input
                  value={columnTitle}
                  onChange={handleColumnTitleChange}
                  onBlur={handleColumnTitleBlur}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="h-7 w-full"
                />
              ) : (
                <div className="font-bold text-sm truncate flex-1 text-center">
                  {column.title}
                </div>
              )}
              {/* <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleDeleteClick(column.id)}
              >
                <span className="sr-only">删除列</span>
                <Trash2 className="h-4 w-4" />
              </Button> */}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              您确定要删除此列吗？此操作不可恢复，列中的所有数据将会永久丢失。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const GridTableHeader = React.memo(GridTableHeaderComponent, (prev, next) => {
  return (
    prev.columns === next.columns &&
    prev.allSelected === next.allSelected &&
    prev.onSelectAll === next.onSelectAll &&
    prev.updateColumnTitle === next.updateColumnTitle &&
    prev.deleteColumn === next.deleteColumn
  );
});
