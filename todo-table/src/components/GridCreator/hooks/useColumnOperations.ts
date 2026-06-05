import { useState, useCallback } from "react";
import { GridColumn, GridRow } from "../GridTypes";
import { defaultColumns } from "../GridUtils";
import {
  updateColumnStyle as apiUpdateColumnStyle,
  updateColumnRule as apiUpdateColumnRule,
  createProjectColumn,
  deleteProjectColumn,
  updateColumnTitle as apiUpdateColumnTitle,
} from "@/lib/projectService";
import { mapApiColumnToGridColumn } from "@/lib/gridTransform";
import { toast } from "@/components/ui/use-toast";

/**
 * 处理表格列相关的操作
 * @param projectId 当前项目 ID
 * @param setRows 同步更新行内单元格（增删列时）
 */
export const useColumnOperations = (
  projectId: string,
  setRows: React.Dispatch<React.SetStateAction<GridRow[]>>
) => {
  const [columns, setColumns] = useState<GridColumn[]>(() => defaultColumns);

  const appendColumnCells = useCallback(
    (column: GridColumn) => {
      setRows((prev) =>
        prev.map((row) => ({
          ...row,
          cells: [
            ...row.cells,
            {
              id: "",
              content: "",
              type: column.type || "text",
              style: {},
              row: row.row_id || row.id,
              column: column.id,
              columnDefinition: column,
            },
          ],
        }))
      );
    },
    [setRows]
  );

  const removeColumnCells = useCallback(
    (columnId: string) => {
      setRows((prev) =>
        prev.map((row) => ({
          ...row,
          cells: row.cells.filter(
            (cell) => cell.column !== columnId && cell.columnDefinition?.id !== columnId
          ),
        }))
      );
    },
    [setRows]
  );

  const addColumn = useCallback(async () => {
    if (!projectId) {
      toast({
        description: "项目 ID 不能为空，无法添加列",
        variant: "destructive",
      });
      return;
    }

    try {
      const col = await createProjectColumn(projectId);
      const newColumn = mapApiColumnToGridColumn(col);
      setColumns((prev) => [...prev, newColumn]);
      appendColumnCells(newColumn);
    } catch (error) {
      console.error("添加列失败:", error);
      toast({
        description: `添加列失败: ${error instanceof Error ? error.message : "未知错误"}`,
        variant: "destructive",
      });
    }
  }, [projectId, appendColumnCells]);

  const updateColumnTitle = useCallback(
    async (columnId: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;

      setColumns((prev) =>
        prev.map((col) => (col.id === columnId ? { ...col, title: trimmed } : col))
      );

      try {
        await apiUpdateColumnTitle(columnId, trimmed);
      } catch (error) {
        console.error(`更新列标题失败 (ID: ${columnId}):`, error);
        toast({
          description: `更新列标题失败: ${error instanceof Error ? error.message : "未知错误"}`,
          variant: "destructive",
        });
      }
    },
    []
  );

  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    setColumns((prev) =>
      prev.map((col) => (col.id === columnId ? { ...col, width } : col))
    );
  }, []);

  const deleteColumn = useCallback(
    async (columnId: string) => {
      try {
        await deleteProjectColumn(columnId);
        setColumns((prev) => prev.filter((col) => col.id !== columnId));
        removeColumnCells(columnId);
      } catch (error) {
        console.error(`删除列失败 (ID: ${columnId}):`, error);
        toast({
          description: `删除列失败: ${error instanceof Error ? error.message : "未知错误"}`,
          variant: "destructive",
        });
      }
    },
    [removeColumnCells]
  );

  const updateColumnStyle = useCallback(
    async (columnId: string, style: GridColumn["style"]) => {
      try {
        await apiUpdateColumnStyle(columnId, style || {});

        setColumns((prev) =>
          prev.map((col) => (col.id === columnId ? { ...col, style } : col))
        );
      } catch (error) {
        console.error(`更新列样式失败 (ID: ${columnId}):`, error);
        toast({
          description: `更新列样式失败: ${error instanceof Error ? error.message : "未知错误"}`,
          variant: "destructive",
        });
      }
    },
    []
  );

  const updateColumnRule = useCallback(
    async (columnId: string, rule: GridColumn["rule"]) => {
      try {
        await apiUpdateColumnRule(columnId, rule || {});

        setColumns((prev) =>
          prev.map((col) => (col.id === columnId ? { ...col, rule } : col))
        );
      } catch (error) {
        console.error(`更新列规则失败 (ID: ${columnId}):`, error);
        toast({
          description: `更新列规则失败: ${error instanceof Error ? error.message : "未知错误"}`,
          variant: "destructive",
        });
      }
    },
    []
  );

  return {
    columns,
    setColumns,
    addColumn,
    updateColumnTitle,
    updateColumnWidth,
    updateColumnStyle,
    updateColumnRule,
    deleteColumn,
  };
};
