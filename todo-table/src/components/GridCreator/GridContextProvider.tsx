import React, { createContext, useState } from "react";
import { useRowOperations } from "./hooks/useRowOperations";
import { useColumnOperations } from "./hooks/useColumnOperations";
import { useCellOperations } from "./hooks/useCellOperations";
import { useShareOperations } from "./hooks/useShareOperations";
import { GridContextType } from "./GridContextTypes";
import { getVendors, Vendor } from "@/lib/projectService";
import { toast } from "@/components/ui/use-toast";
import { useProjectStore } from "@/store/projectStore";

export const GridContext = createContext<GridContextType | undefined>(undefined);

/**
 * Grid上下文提供者组件
 * 整合所有的操作hooks，提供统一的上下文
 */
export const GridProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children
}) => {
  // 从projectStore获取projectId
  const { projectId: storeProjectId } = useProjectStore();
  
  // 行操作需先于列操作初始化，以便增删列时同步更新单元格
  const rowOps = useRowOperations(storeProjectId || '');
  const columnOps = useColumnOperations(storeProjectId || '', rowOps.setRows);
  const cellOps = useCellOperations(storeProjectId || '');
  const shareOps = useShareOperations();
  
  // 添加全局供应商状态
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);

  // 获取供应商列表
  React.useEffect(() => {
    const fetchVendors = async () => {
      try {
        setVendorsLoading(true);
        const vendorsData = await getVendors();
        setVendors(vendorsData);
      } catch (error) {
        console.error('获取供应商列表失败:', error);
        toast({ 
          title: '获取供应商列表失败', 
          description: '请稍后再试',
          variant: 'destructive'
        });
      } finally {
        setVendorsLoading(false);
      }
    };
    
    fetchVendors();
  }, []);

  // 计算选中的行数
  const selectedRowsCount = rowOps.rows.filter(row => row.isSelected).length;

  // 单元格选择相关方法
  const toggleCellSelection = (rowIndex: number, columnIndex: number, options?: { shiftKey?: boolean }) => {
    cellOps.setSelectedCells(prev => {
      const pos = { rowIndex, columnIndex };
      if (options?.shiftKey) {
        const existingIndex = prev.findIndex(cell => 
          cell.rowIndex === rowIndex && cell.columnIndex === columnIndex
        );
        return existingIndex >= 0
          ? prev.filter((_, i) => i !== existingIndex)
          : [...prev, pos];
      }
      return [pos];
    });
  };

  const handleSetSelectedCells = (cells: { rowIndex: number; columnIndex: number }[]) => {
    cellOps.setSelectedCells(cells);
  };

  const clearCellSelection = () => {
    cellOps.setSelectedCells([]);
  };

  const isCellSelected = (rowIndex: number, columnIndex: number) => {
    return cellOps.selectedCells.some(
      cell => cell.rowIndex === rowIndex && cell.columnIndex === columnIndex
    );
  };

  // 应用样式到选中的单元格
  const applyStyleToSelectedCells = (style: { backgroundColor?: string; textColor?: string }) => {
    if (cellOps.selectedCells.length === 0) return;

    rowOps.setRows(prev => {
      return prev.map((row, rowIndex) => {
        const updatedCells = row.cells.map((cell, colIndex) => {
          if (cellOps.selectedCells.some(pos => 
            pos.rowIndex === rowIndex && pos.columnIndex === colIndex
          )) {
            return {
              ...cell,
              style: { ...cell.style, ...style }
            };
          }
          return cell;
        });

        return {
          ...row,
          cells: updatedCells
        };
      });
    });
  };

  // 清除所有选中单元格的样式
  const clearAllCellStyle = () => {
    if (cellOps.selectedCells.length === 0) return;

    rowOps.setRows(prev => {
      return prev.map((row, rowIndex) => {
        const updatedCells = row.cells.map((cell, colIndex) => {
          if (cellOps.selectedCells.some(pos => 
            pos.rowIndex === rowIndex && pos.columnIndex === colIndex
          )) {
            return {
              ...cell,
              style: {}
            };
          }
          return cell;
        });

        return {
          ...row,
          cells: updatedCells
        };
      });
    });
  };

  // 包装生成分享链接函数来匹配类型定义
  const wrappedGenerateShareLink = async () => {
    try {
      await shareOps.generateShareLink(rowOps.rows);
    } catch (error) {
      // 将错误传递给调用者
      throw error;
    }
  };

  // 使用store中的setProjectId方法
  const { setProjectId } = useProjectStore();

  // 整合所有context值
  const contextValue: GridContextType = {
    ...columnOps,
    ...rowOps,
    selectedCells: cellOps.selectedCells,
    shareInfo: shareOps.shareInfo,
    vendorLinks: shareOps.vendorLinks, // 添加供应商链接到上下文
    selectedRowsCount,
    loading: rowOps.loading || shareOps.isLoading, // 包含分享加载状态
    extractVendors: cellOps.extractVendors,
    getUniqueVendorsForCell: cellOps.getUniqueVendorsForCell,
    isUploading: cellOps.isUploading,
    
    // 添加供应商相关状态
    vendors,
    setVendors,
    vendorsLoading,

    // 暴露 setColumns 和 setRows 方法
    setColumns: columnOps.setColumns,
    setRows: rowOps.setRows,

    updateCellContent: cellOps.updateCellContent(rowOps.rows, rowOps.setRows),
    updateCellStyle: cellOps.updateCellStyle(rowOps.rows, rowOps.setRows),
    uploadCellFile: cellOps.uploadCellFile(rowOps.rows, rowOps.setRows),
    removeCellFile: cellOps.removeCellFile(rowOps.rows, rowOps.setRows),
    
    toggleCellSelection,
    setSelectedCells: handleSetSelectedCells,
    clearCellSelection,
    isCellSelected,
    applyStyleToSelectedCells,
    clearAllCellStyle,

    // 使用包装后的函数
    generateShareLink: wrappedGenerateShareLink,
    clearShareInfo: shareOps.clearShareInfo,
    
    // 提供store中的projectId和setProjectId方法
    projectId: storeProjectId,
    setProjectId
  };

  return (
    <GridContext.Provider value={contextValue}>
      {children}
    </GridContext.Provider>
  );
};

