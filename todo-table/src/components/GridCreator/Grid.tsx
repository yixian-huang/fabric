import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useGridContext } from './GridContextHooks';
import { GridHeader } from './GridHeader';
import { GridBody } from './GridBody';
import { GridFooter } from './GridFooter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useParams } from 'react-router-dom';
import { getProjectDetail, getProjectTodoDetail, getProjectSharedLinks, SharedLinkResponse, deleteSharedLink, generateVendorLinks, getVendorSharedLinks, ProjectDetail, updateColumn } from '@/lib/projectService';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { GridColumn } from './GridTypes';
import { useProjectStore } from '@/store/projectStore';

export const Grid: React.FC = () => {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const { 
    projectId: storeProjectId, 
    setProjectId, 
    fetchProjectDetail, 
    fetchTodoProject,
    isLoading: storeLoading 
  } = useProjectStore();
  
  const {
    rows,
    columns,
    shareInfo,
    vendorLinks,
    addColumn,
    generateShareLink,
    clearShareInfo,
    selectAllRows,
    selectedRowsCount,
    updateColumnWidth,
    setColumns,
    setRows,
  } = useGridContext();

  const [isResizing, setIsResizing] = useState(false);
  const [resizingWidth, setResizingWidth] = useState<number | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [viewLinksDialogOpen, setViewLinksDialogOpen] = useState(false);
  const [sharedLinks, setSharedLinks] = useState<SharedLinkResponse[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [projectName, setProjectName] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [createdAt, setCreatedAt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewVendorLinksDialogOpen, setViewVendorLinksDialogOpen] = useState(false);
  const [vendorSharedLinks, setVendorSharedLinks] = useState<any[]>([]);
  const [isLoadingVendorLinks, setIsLoadingVendorLinks] = useState(false);
  const [bodyViewportHeight, setBodyViewportHeight] = useState(0);
  const [bodyViewportWidth, setBodyViewportWidth] = useState(0);
  const [bodyScrollTop, setBodyScrollTop] = useState(0);
  const scrollRafRef = useRef<number | null>(null);
  const pendingScrollRef = useRef({ left: 0, top: 0 });
  const resizeRafRef = useRef<number | null>(null);
  const pendingResizeWidthRef = useRef<number | null>(null);
  const resizeColumnIndexRef = useRef<number | null>(null);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);

  const gridRef = useRef<HTMLDivElement>(null);
  const gridBodyRef = useRef<HTMLDivElement>(null);


  const setProjectDetails = (data: ProjectDetail, columnMap: Map<string, GridColumn>) => {
    // 设置项目基本信息
    setProjectName(data.name);
    setBaseUrl(data.base_url);
    setCreatedAt(data.created_at);
    
    // 更新项目ID到store
    if (data.project_id) {
      setProjectId(data.project_id);
    }
    
    let formattedColumns: GridColumn[] = [];
    // 如果有列数据，转换为前端格式
    if (data.columns && data.columns.length > 0) {
      formattedColumns = data.columns
        .sort((a, b) => a.column_index - b.column_index)
        .map(col => {
          const column = {
            id: col.column_id,
            title: col.title,
            width: col.width || 100,
            type: col.type as any || 'text',
            style: col.style_data,
            rule: col.rule_data
          };
          columnMap.set(col.column_id, column);
          return column;
        });

      setColumns(formattedColumns);
    }

    // 如果有行数据，转换为前端格式
    if (data.rows && data.rows.length > 0) {
      const formattedRows = data.rows
        .sort((a, b) => a.row_index - b.row_index)
        .map(row => {
          return {
            id: row.row_id,
            row_id: row.row_id,
            isSelected: false,
            cells: row.cells.map(cell => {
              // 解析样式JSON字符串
              let style = {};
              try {
                style = JSON.parse(cell.style || '{}');
              } catch (e) {
                console.error('解析单元格样式失败:', e);
              }
              let files = [];
              if (cell.type !== 'text' && cell.type !== 'date') {
                files = JSON.parse(cell.content || '[]');
              }
              return {
                id: cell.cell_id,
                content: cell.content,
                type: cell.type as any || 'text',
                style,
                files,
                row: cell.row,
                column: cell.column,
                columnDefinition: columnMap.get(cell.column)
              };
            })
          };
        });

      setRows(formattedRows);
    }
  }

  // 从API获取项目详情
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const columnMap = new Map<string, GridColumn>();
      try {
        let data;
        
        // 优先使用URL中的项目ID
        if (urlProjectId) {
          data = await fetchProjectDetail(urlProjectId);
        } 
        // 其次使用store中的项目ID
        else if (storeProjectId) {
          data = await fetchProjectDetail(storeProjectId);
        } 
        // 如果两者都没有，获取待办项目
        else {
          data = await fetchTodoProject();
        }
        
        if (data) {
          setProjectDetails(data, columnMap);
        }
      } catch (error) {
        console.error('获取项目详情失败:', error);
        toast({
          title: '获取项目详情失败',
          description: '请检查网络连接或刷新页面重试',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [urlProjectId, storeProjectId, fetchProjectDetail, fetchTodoProject, setProjectId]);
  
  
  // Check if all rows are selected
  const allSelected = rows.length > 0 && rows.every(row => row.isSelected);

  const displayColumns = useMemo(() => {
    if (!isResizing || resizingWidth === null || resizeColumnIndexRef.current === null) {
      return columns;
    }

    return columns.map((column, index) => (
      index === resizeColumnIndexRef.current
        ? { ...column, width: resizingWidth }
        : column
    ));
  }, [columns, isResizing, resizingWidth]);

  // Handle column resizing
  const handleResizeStart = (index: number, e: React.MouseEvent) => {
    const currentWidth = columns[index]?.width ?? 100;
    setIsResizing(true);
    setResizingWidth(currentWidth);
    pendingResizeWidthRef.current = currentWidth;
    resizeColumnIndexRef.current = index;
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = currentWidth;
    e.preventDefault();
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || resizeColumnIndexRef.current === null) return;

    const diff = e.clientX - resizeStartXRef.current;
    const newWidth = Math.max(50, resizeStartWidthRef.current + diff);
    pendingResizeWidthRef.current = newWidth;

    if (resizeRafRef.current !== null) return;

    resizeRafRef.current = requestAnimationFrame(() => {
      if (pendingResizeWidthRef.current !== null) {
        setResizingWidth(pendingResizeWidthRef.current);
      }
      resizeRafRef.current = null;
    });
  };

  const handleResizeEnd = () => {
    const columnIndex = resizeColumnIndexRef.current;
    const finalWidth = pendingResizeWidthRef.current ?? resizingWidth;

    if (columnIndex !== null && finalWidth !== null && columns[columnIndex]) {
      const column = columns[columnIndex];
      updateColumnWidth(column.id, finalWidth);
      // 调用更新列宽度接口
      updateColumn(column.id, { ...column, width: finalWidth })
        .catch(error => {
          console.error('更新列宽度失败:', error);
          toast({
            title: '更新列宽度失败',
            description: '无法保存列宽度设置，请稍后重试',
            variant: 'destructive'
          });
        });
    }

    if (resizeRafRef.current !== null) {
      cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = null;
    }

    pendingResizeWidthRef.current = null;
    resizeColumnIndexRef.current = null;
    resizeStartXRef.current = 0;
    resizeStartWidthRef.current = 0;
    setIsResizing(false);
    setResizingWidth(null);
  };

  // Handle scroll synchronization
  const handleBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    pendingScrollRef.current = {
      left: e.currentTarget.scrollLeft,
      top: e.currentTarget.scrollTop,
    };

    if (scrollRafRef.current !== null) {
      return;
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      const { left, top } = pendingScrollRef.current;
      setScrollPosition(left);
      setBodyScrollTop(top);
      scrollRafRef.current = null;
    });
  };

  // Set up event listeners for column resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
    }
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, columns, resizingWidth]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const element = gridBodyRef.current;
    if (!element) return;

    const updateViewportHeight = () => {
      setBodyViewportHeight(element.clientHeight);
      setBodyViewportWidth(element.clientWidth);
    };

    updateViewportHeight();

    const resizeObserver = new ResizeObserver(updateViewportHeight);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Share selected rows
  const handleShareClick = useCallback(async () => {
    if (selectedRowsCount > 0) {
      try {
        await generateShareLink();
        setShareDialogOpen(true);
      } catch (error) {
        console.error("生成分享链接失败", error);
      }
    } else {
      toast({
        title: "请选择行",
        description: "请先选择要分享的行",
        variant: "destructive",
      });
    }
  }, [selectedRowsCount, generateShareLink]);

  // Close share dialog
  const closeShareDialog = () => {
    setShareDialogOpen(false);
    clearShareInfo();
  };

  // Copy share link to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "复制成功",
      description: "链接已复制到剪贴板",
    });
  };

  const handleViewLinksClick = useCallback(async () => {
    const currentProjectId = urlProjectId || storeProjectId;
    if (!currentProjectId) return;

    setIsLoadingLinks(true);
    try {
      const links = await getProjectSharedLinks(currentProjectId);
      setSharedLinks(links);
      setViewLinksDialogOpen(true);
    } catch (error) {
      console.error("获取共享链接失败", error);
      toast({
        title: "获取共享链接失败",
        description: "无法获取项目的共享链接，请稍后重试",
        variant: "destructive"
      });
    } finally {
      setIsLoadingLinks(false);
    }
  }, [urlProjectId, storeProjectId]);

  // Close view links dialog
  const closeViewLinksDialog = () => {
    setViewLinksDialogOpen(false);
  };

  // 删除共享链接
  const handleDeleteLink = async (sharedId: string) => {
    if (!confirm('确定要删除此共享链接吗？')) {
      return;
    }

    try {
      await deleteSharedLink(sharedId);
      // 删除成功后更新列表
      setSharedLinks(prev => prev.filter(link => link.shared_id !== sharedId));
      toast({
        title: "删除成功",
        description: "已成功删除共享链接",
      });
    } catch (error) {
      console.error("删除共享链接失败", error);
      toast({
        title: "删除失败",
        description: "无法删除共享链接，请稍后重试",
        variant: "destructive"
      });
    }
  };

  const handleViewVendorLinksClick = useCallback(async () => {
    const currentProjectId = urlProjectId || storeProjectId;
    if (!currentProjectId) return;

    setIsLoadingVendorLinks(true);
    try {
      await generateVendorLinks(currentProjectId);
      const links = await getVendorSharedLinks(currentProjectId);
      setVendorSharedLinks(links);
      setViewVendorLinksDialogOpen(true);
    } catch (error) {
      console.error("获取供应商链接失败", error);
      toast({
        title: "获取供应商链接失败",
        description: "无法获取项目的供应商链接，请稍后重试",
        variant: "destructive"
      });
    } finally {
      setIsLoadingVendorLinks(false);
    }
  }, [urlProjectId, storeProjectId]);

  // 关闭供应商链接对话框
  const closeVendorLinksDialog = () => {
    setViewVendorLinksDialogOpen(false);
  };

  // 加载中状态
  if (isLoading || storeLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-500" />
          <div className="text-gray-500">加载项目数据...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full" ref={gridRef}>
      <GridHeader
        onAddColumn={addColumn}
        onShareClick={handleShareClick}
        onViewLinksClick={handleViewLinksClick}
        onViewVendorLinksClick={handleViewVendorLinksClick}
        isLoadingLinks={isLoadingLinks}
        isLoadingVendorLinks={isLoadingVendorLinks}
        projectName={projectName}
        createdAt={createdAt}
      />

      <div
        className="flex-1 overflow-auto  h-[calc(100%-80px)]"
        ref={gridBodyRef}
        onScroll={handleBodyScroll}
        style={{
          transform: 'scale(-1)',
        }}
      >
        <GridBody
          onHandleResizeStart={handleResizeStart}
          columns={displayColumns}
          rows={rows}
          baseUrl={baseUrl}
          allSelected={allSelected}
          onSelectAll={selectAllRows}
          viewportHeight={bodyViewportHeight}
          scrollTop={bodyScrollTop}
          viewportWidth={bodyViewportWidth}
          scrollLeft={scrollPosition}
        />
      </div>

      <GridFooter onShareClick={handleShareClick} />

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={open => !open && closeShareDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>分享链接</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              <span className="ml-2">正在生成分享链接...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {vendorLinks && vendorLinks.size > 0 && (
                <div className="space-y-2">
                  <div className="font-medium">供应商专属链接:</div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {Array.from(vendorLinks.entries()).map(([vendor, link]) => (
                      <div key={vendor} className="flex items-center space-x-2">
                        <div className="flex-shrink-0 w-24 truncate">{vendor}:</div>
                        <div className="flex flex-1">
                          <input
                            type="text"
                            readOnly
                            value={link + '?password=' + shareInfo?.password}
                            className="flex-1 rounded-l-md border p-2 bg-gray-50"
                          />
                          <Button
                            onClick={() => copyToClipboard(link + '?password=' + shareInfo?.password)}
                            className="rounded-l-none"
                          >
                            复制
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="font-medium">已选择:</div>
                <div className="text-sm text-gray-500">{selectedRowsCount} 行数据</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={closeShareDialog}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Shared Links Dialog */}
      <Dialog open={viewLinksDialogOpen} onOpenChange={open => !open && closeViewLinksDialog()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>项目共享链接</DialogTitle>
          </DialogHeader>
          {isLoadingLinks ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              <span className="ml-2">正在加载共享链接...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {sharedLinks.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  暂无共享链接
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <div className="flex justify-between font-medium pb-2 border-b">
                    <div className='w-48'>合作者</div>
                    <div className='w-100'>链接</div>
                    <div className='w-24'>行数</div>
                  </div>
                  {sharedLinks.map((link) => {
                    const origin = window.location.origin;
                    const fullLink = `${origin}/share/${link.shared_key}?password=${link.shared_password}`;
                    return (
                      <div key={link.shared_id} className="flex justify-between py-2 border-b border-gray-100">
                        <div className="w-48 truncate">{link.vender || '全部'}</div>
                        <div className="w-100 flex items-center">
                          <input
                            type="text"
                            readOnly
                            value={fullLink}
                            className="w-80 flex-1 rounded-l-md border p-2 bg-gray-50 text-xs"
                          />
                          <Button
                            onClick={() => copyToClipboard(fullLink)}
                            className="rounded-l-none h-9"
                            size="sm"
                          >
                            复制
                          </Button>
                        </div>
                        <div className='w-24 flex items-center justify-between'>
                          <span>{link.row_ids_list?.length || 0} 行</span>
                          <Button
                            onClick={() => handleDeleteLink(link.shared_id)}
                            variant="destructive"
                            size="sm"
                            className="h-7 px-2"
                          >
                            删除
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={closeViewLinksDialog}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 供应商链接对话框 */}
      <Dialog open={viewVendorLinksDialogOpen} onOpenChange={closeVendorLinksDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>供应商链接</DialogTitle>
          </DialogHeader>
          
          {vendorSharedLinks.length > 0 ? (
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-2 px-4 font-medium text-sm text-gray-600">供应商</th>
                    <th className="text-left py-2 px-4 font-medium text-sm text-gray-600">链接</th>
                    <th className="text-left py-2 px-4 font-medium text-sm text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorSharedLinks.map((link) => (
                    <tr key={link.vendor_share_id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{link.vendor_name.toUpperCase()}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <input
                            type="text"
                            value={`${window.location.origin}/v/${link.vendor_detail?.name}?password=${link.shared_password}`}
                            readOnly
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(`${window.location.origin}/v/${link.vendor_detail?.name}?password=${link.shared_password}`)}
                            className="ml-2"
                          >
                            <svg
                              className="w-4 h-4"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </Button>
                        </div>
                      </td>
  
                      <td className="py-3 px-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => window.open(`/v/${link.vendor_detail?.name}?password=${link.shared_password}`, '_blank')}
                        >
                          预览
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              {isLoadingVendorLinks ? (
                <div className="flex justify-center items-center">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  正在加载供应商链接...
                </div>
              ) : (
                "没有找到供应商链接，请确保项目中有供应商数据"
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={closeVendorLinksDialog}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
