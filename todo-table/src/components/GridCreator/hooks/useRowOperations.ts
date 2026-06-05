import { useState, useCallback } from "react";
import { GridRow } from "../GridTypes";
import { createEmptyRow } from "../GridUtils";
import { toast } from "@/components/ui/use-toast";
import { addProjectRow, deleteProjectRow, toggleRowsHidden } from "@/lib/projectService";
import { mapApiRowToGridRow } from "@/lib/gridTransform";
import { useProjectStore } from "@/store/projectStore";

/**
 * 处理表格行相关的操作
 * @param inputProjectId - 传入的项目ID，如果为空则从store获取
 * @returns 行操作相关的状态和方法
 */
export const useRowOperations = (inputProjectId?: string) => {
  // 如果没有传入项目ID，则从store获取
  const { projectId: storeProjectId } = useProjectStore();
  const projectId = inputProjectId || storeProjectId;
  
  const [rows, setRows] = useState<GridRow[]>(() => []);
  const [loading, setLoading] = useState(false);

  // 添加新行
  const addRow = useCallback(async () => {
    if (!projectId) {
      toast({ description: "项目ID不能为空", variant: "destructive" });
      return;
    }
    setLoading(true);
      // 调用后端接口创建行
      addProjectRow(projectId).then(result => {
        const gridRow = mapApiRowToGridRow(result, new Map());
        setRows(prev => [...prev, gridRow]);
        setLoading(false);
      })
  }, [projectId]);

  // 切换行选中状态
  const toggleRowSelection = useCallback((rowId: string) => {
    setRows(prev =>
      prev.map(row =>
        row.id === rowId ? { ...row, isSelected: !row.isSelected } : row
      )
    );
  }, []);

  // 删除选中的行
  const deleteSelectedRows = useCallback(async () => {
    const selectedRows = rows.filter(row => row.isSelected);
    if (selectedRows.length === 0) return;
    
    setLoading(true);
    try {
      // 并行处理所有删除请求
      const deletePromises = selectedRows.map(row => 
        deleteProjectRow(row.id)
      );
      
      await Promise.all(deletePromises);
      
      // 更新本地状态
      setRows(prev => prev.filter(row => !row.isSelected));
      toast({ description: `已删除${selectedRows.length}行` });
    } catch (error) {
      console.error("删除行失败:", error);
      toast({ 
        description: `删除行失败: ${error instanceof Error ? error.message : '未知错误'}`,
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  }, [rows]);

  // 全选/取消全选
  const selectAllRows = useCallback((selected: boolean) => {
    setRows(prev => prev.map(row => ({ ...row, isSelected: selected })));
  }, []);

  // 隐藏选中的行
  const hideSelectedRows = useCallback(async () => {
    const selectedRows = rows.filter(row => row.isSelected);
    if (selectedRows.length === 0) {
      toast({ description: "请先选择要隐藏的行" });
      return;
    }
    
    const selectedRowIds = selectedRows.map(row => row.id);
    setLoading(true);
    
    try {
      // 调用API设置行为隐藏状态
      await toggleRowsHidden(selectedRowIds, true);
      
      // 更新本地状态
      setRows(prev => prev.map(row => 
        selectedRowIds.includes(row.id) 
          ? { ...row, hidden: true, isSelected: false }
          : row
      ));
      
      toast({ description: `已隐藏 ${selectedRowIds.length} 行` });
    } catch (error) {
      console.error("隐藏行失败:", error);
      toast({ 
        description: `隐藏行失败: ${error instanceof Error ? error.message : '未知错误'}`,
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  }, [rows]);

  // 将已取消隐藏的行恢复到主表格
  const restoreHiddenRow = useCallback((row: GridRow) => {
    const rowId = row.row_id || row.id;
    setRows((prev) => {
      const existing = prev.find((r) => r.id === rowId);
      if (existing) {
        return prev.map((r) =>
          r.id === rowId ? { ...r, hidden: false, isSelected: false } : r
        );
      }
      return [
        ...prev,
        { ...row, id: rowId, row_id: rowId, hidden: false, isSelected: false },
      ];
    });
    toast({ description: "已显示 1 行" });
  }, []);

  return {
    rows,
    setRows,
    addRow,
    toggleRowSelection,
    deleteSelectedRows,
    selectAllRows,
    hideSelectedRows,
    restoreHiddenRow,
    loading
  };
};
