import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getRows, toggleRowsHidden } from "@/lib/projectService";
import { GridRow } from "./GridTypes";
import { renderCellContent } from "@/lib/utils";
import { useProjectStore } from "@/store/projectStore";
import { useGridContext } from "./GridContextHooks";
import { mapApiRowsToGridRows } from "@/lib/gridTransform";

interface HiddenRowsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


export const HiddenRowsDialog: React.FC<HiddenRowsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { 
    projectId: storeProjectId, 
  } = useProjectStore();
  const [hiddenRows, setHiddenRows] = useState<GridRow[]>([]);
  const [loading, setLoading] = useState(false);

  const { columns, restoreHiddenRow } = useGridContext();

  const handleShowHiddenRows = async (row: GridRow) => {
    setLoading(true);
    try {
      await toggleRowsHidden([row.row_id], false);
      setHiddenRows((prev) => prev.filter((r) => r.row_id !== row.row_id));
      restoreHiddenRow(row);
    } catch (error) {
      console.error("恢复隐藏行失败:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && storeProjectId) {
      const fetchHiddenRows = async () => {
        const response = await getRows(storeProjectId, true);
        setHiddenRows(mapApiRowsToGridRows(response ?? [], columns));
      };
      fetchHiddenRows();
    }
  }, [open, storeProjectId, columns]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>隐藏的行</DialogTitle>
          <DialogDescription>
            这里列出所有被隐藏的行，你可以选择恢复任意一行到主表格中。
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 max-h-[200px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">序号</th>
                <th className="px-4 py-2 text-left">客户</th>
                <th className="px-4 py-2 text-left">成衣款号</th>
                <th className="px-4 py-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {!hiddenRows || hiddenRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-center">暂无隐藏的行</td>
                </tr>
              ) : (
                hiddenRows.map((row, index) => (
                  <tr key={index} className="border-b">
                    {row.cells.slice(0, 3).map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-2">{renderCellContent(cell) || "-"}</td>
                    ))}
                    <td className="px-4 py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShowHiddenRows(row)}
                        disabled={loading}
                      >
                        恢复
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 