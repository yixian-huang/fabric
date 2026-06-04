import { useState, useCallback, useEffect, useRef } from "react";
import { Cell, CellStyle, CellPos, FileData, VendorTag } from "../GridTypes";
import { parseVendorTags } from "../utils/vendorUtils";
import { updateCellLatest } from "@/lib/cellsService";
import { updateImage } from "@/lib/projectService";
import { useProjectStore } from "@/store/projectStore";

/**
 * 处理单元格相关的操作
 * @param inputProjectId - 传入的项目ID，如果为空则从store获取
 * @returns 单元格操作相关的状态和方法
 */
export const useCellOperations = (inputProjectId?: string) => {
  // 如果没有传入项目ID，则从store获取
  const { projectId: storeProjectId } = useProjectStore();
  const projectId = inputProjectId || storeProjectId;
  
  const [selectedCells, setSelectedCells] = useState<CellPos[]>([]);
  const [uploadingCells, setUploadingCells] = useState<{[key: string]: boolean}>({});
  const contentDebounceTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingContentUpdatesRef = useRef<Record<string, {
    project: string;
    row: string;
    column: string;
    content: string;
    type: Cell["type"];
  }>>({});
  const TEXT_UPDATE_DEBOUNCE_MS = 300;

  // 获取单元格唯一标识
  const getCellKey = useCallback((rowId: string, columnIndex: number) => {
    return `${rowId}-${columnIndex}`;
  }, []);

  // 检查单元格是否正在上传
  const isUploading = useCallback((rowId: string, columnIndex: number) => {
    const cellKey = getCellKey(rowId, columnIndex);
    return !!uploadingCells[cellKey];
  }, [uploadingCells, getCellKey]);

  // Extract unique vendors from all vendor cells
  const extractVendors = useCallback((rows: any[]) => {
    const vendorSet = new Set<VendorTag>();
    rows.forEach(row => {
      row.cells.forEach((cell: Cell) => {
        if (cell.type === 'vendor' && cell.content) {
          const vendors = parseVendorTags(cell);
          vendors.forEach(vendor => {
            vendorSet.add(vendor);
          });
        }
      });
    });
    return Array.from(vendorSet);
  }, []);

  // Get unique vendors for a specific cell, now filtering by name instead of id
  const getUniqueVendorsForCell = useCallback((allVendors: VendorTag[], currentVendors: VendorTag[]) => {
    const currentVendorNames = new Set(currentVendors.map(v => v.name.toLowerCase()));
    return allVendors.filter(v => !currentVendorNames.has(v.name.toLowerCase()));
  }, []);

  // 更新单元格内容
  const flushDebouncedContentUpdate = useCallback(async (cellKey: string) => {
    const payload = pendingContentUpdatesRef.current[cellKey];
    if (!payload) return;

    delete pendingContentUpdatesRef.current[cellKey];
    delete contentDebounceTimersRef.current[cellKey];

    try {
      await updateCellLatest(payload);
    } catch (error) {
      console.error('更新单元格内容失败:', error);
    }
  }, []);

  useEffect(() => {
    return () => {
      const activeKeys = Object.keys(contentDebounceTimersRef.current);
      for (const key of activeKeys) {
        clearTimeout(contentDebounceTimersRef.current[key]);
        void flushDebouncedContentUpdate(key);
      }
    };
  }, [flushDebouncedContentUpdate]);

  const updateCellContent = useCallback((rows: any[], setRows: Function) =>
    async (rowId: string, columnIndex: number, content: string) => {
      if (!projectId) return;

      // 首先更新前端状态，以便立即反馈给用户
      setRows(prev =>
        prev.map(row =>
          row.id === rowId
            ? {
              ...row,
              cells: row.cells.map((cell: Cell, index: number) =>
                index === columnIndex ? { ...cell, content } : cell
              )
            }
            : row
        )
      );

      // 然后调用 API 更新后端数据
      try {
        const row = rows.find(r => r.id === rowId);
        if (row) {
          const cell = row.cells[columnIndex];
          const payload = {
            project: projectId,
            row: cell.row,
            column: cell.column,
            content,
            type: cell.type
          };

          // 文本类型高频输入使用防抖合并，其他类型保持实时更新
          if (cell.type === 'text') {
            const cellKey = getCellKey(rowId, columnIndex);
            pendingContentUpdatesRef.current[cellKey] = payload;

            if (contentDebounceTimersRef.current[cellKey]) {
              clearTimeout(contentDebounceTimersRef.current[cellKey]);
            }

            contentDebounceTimersRef.current[cellKey] = setTimeout(() => {
              void flushDebouncedContentUpdate(cellKey);
            }, TEXT_UPDATE_DEBOUNCE_MS);
          } else {
            await updateCellLatest(payload);
          }
        }
      } catch (error) {
        console.error('更新单元格内容失败:', error);
        // 可以在这里添加错误处理，例如回滚前端状态或显示错误消息
      }
    }, [flushDebouncedContentUpdate, getCellKey, projectId]);

  // 更新单元格样式
  const updateCellStyle = useCallback((rows: any[], setRows: Function) =>
    async (rowId: string, columnIndex: number, style: CellStyle) => {
      if (!projectId) return;

      // 首先更新前端状态
      setRows(prev =>
        prev.map(row =>
          row.id === rowId
            ? {
              ...row,
              cells: row.cells.map((cell: Cell, index: number) =>
                index === columnIndex
                  ? {
                    ...cell,
                    style: { ...cell.style, ...style }
                  }
                  : cell
              )
            }
            : row
        )
      );

      // 然后调用 API 更新后端数据
      try {
        const row = rows.find(r => r.id === rowId);
        if (row) {
          const cell = row.cells[columnIndex];
          const columnId = cell.column || cell.id.split('-')[1]; // 尝试获取列ID
          const updatedStyle = { ...cell.style, ...style };

          await updateCellLatest({
            project: projectId,
            row: cell.row,
            column: cell.column,
            content: typeof cell.content === 'string' ? cell.content : JSON.stringify(cell.content),
            type: cell.type,
            style_data: updatedStyle
          });
        }
      } catch (error) {
        console.error('更新单元格样式失败:', error);
        // 可以在这里添加错误处理
      }
    }, [projectId]);

  // 处理文件上传
  const uploadCellFile = useCallback((rows: any[], setRows: Function) =>
    async (rowId: string, columnIndex: number, file: File) => {
      if (!projectId) return;
      const cellKey = getCellKey(rowId, columnIndex);
      
      // 设置上传状态为true
      setUploadingCells(prev => ({
        ...prev,
        [cellKey]: true
      }));

      const fileURL = URL.createObjectURL(file);
      const fileData: FileData = {
        name: file.name,
        url: fileURL
      };

      try {
        // 调用 API 更新后端数据
        const imageResponse = await updateImage(file, projectId);
        const row = rows.find(r => r.id === rowId);
        if (row) {
          const cell = row.cells[columnIndex];
          let fileContent = [];
          if (cell.type == 'file') {
            fileContent = JSON.parse(cell.content || '[]')
          }
          fileContent.push({
            file_id: imageResponse.file_id,
            name: imageResponse.file_name,
            url: imageResponse.url,
          });
          let cellData = {
            project: projectId,
            row: cell.row,
            column: cell.column,
            content: JSON.stringify(fileContent),
            type: cell.type
          }
          await updateCellLatest(cellData);
          
          // 用服务器返回的数据更新前端状态
          setRows(prev => {
            const updatedRows = prev.map(row => {
              if (row.id !== rowId) return row;
              const updatedCells = [...row.cells];
              const cell = updatedCells[columnIndex];
              
              if (cell) {
                updatedCells[columnIndex] = {
                  ...cell,
                  files: fileContent,
                  content: JSON.stringify(fileContent),
                };
              }
              
              return {
                ...row,
                cells: updatedCells
              };
            });
            
            return updatedRows;
          });
        }
      } catch (error) {
        console.error('上传文件失败:', error);
      } finally {
        // 无论成功或失败，都重置上传状态
        setUploadingCells(prev => ({
          ...prev,
          [cellKey]: false
        }));
      }
    }, [getCellKey, projectId]);


  // 移除单元格文件
  const removeCellFile = useCallback((rows: any[], setRows: Function) =>
    async (rowId: string, columnIndex: number, fileIndex: number) => {
      if (!projectId) return;

      // 更新前端状态
      setRows(prev => {
        const updatedRows = prev.map(row => {
          if (row.id !== rowId) return row;

          const updatedCells = [...row.cells];
          const cell = updatedCells[columnIndex];

          if (cell && cell.files) {
            const updatedFiles = [...cell.files];
            updatedFiles.splice(fileIndex, 1);


            updatedCells[columnIndex] = {
              ...cell,
              files: updatedFiles,
              content: JSON.stringify(updatedFiles),
            };
            updateCellLatest({
              project: projectId,
              row: cell.row,
              column: cell.column,
              content: JSON.stringify(updatedFiles),
              type: cell.type
            });
          }

          return {
            ...row,
            cells: updatedCells
          };
        });

        return updatedRows;
      });


    }, [projectId]);

  return {
    selectedCells,
    setSelectedCells,
    isUploading,
    updateCellContent,
    updateCellStyle,
    uploadCellFile,
    removeCellFile,
    extractVendors,
    getUniqueVendorsForCell
  };
};
