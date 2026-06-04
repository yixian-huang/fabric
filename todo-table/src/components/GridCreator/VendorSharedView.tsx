import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast, useToast } from '@/hooks/use-toast';
import { VendorTag } from './GridTypes';
import { accessVendorSharedProject } from '@/lib/projectService';
import { Loader2 } from 'lucide-react';
import { VendorNoteCell } from './VendorNoteCell';
import { Image } from 'antd';
import { UsergroupDeleteOutlined } from '@ant-design/icons';
import { renderCellContent } from '@/lib/utils';

interface Shared {
  shared_key: string;
  shared_password: string;
  vendor: string;
}

export const VendorSharedView: React.FC = () => {
  const { sharedKey } = useParams<{ sharedKey: string }>();
  const location = useLocation();
  const [isPasswordPrompt, setIsPasswordPrompt] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // 项目数据状态
  const [projectData, setProjectData] = useState<any>(null);
  const [columns, setColumns] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [sharedData, setSharedData] = useState<Shared>({ shared_key: '', shared_password: '', vendor: '' });
  const [vendorData, setVendorData] = useState<any>(null);

  // 从URL参数中提取密码
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const passwordParam = params.get('password');
    if (passwordParam) {
      setPassword(passwordParam);
      // 如果URL中有密码，自动提交
      handlePasswordSubmit(null, passwordParam);
    }
  }, [location.search]);

  const handlePasswordSubmit = async (e?: React.FormEvent | null, passParam?: string) => {
    if (e) e.preventDefault();

    if (!sharedKey) {
      setError('共享链接无效');
      toast({
        title: "错误",
        description: "共享链接无效",
        variant: "destructive",
      });
      return;
    }

    const passwordToUse = passParam || password;

    setIsLoading(true);
    try {
      const data = await accessVendorSharedProject(sharedKey, passwordToUse);

      // 设置项目数据
      setProjectData(data.project);
      setColumns(data.project.columns || []);
      setRows(data.project.rows || []);
      setSharedData(data.shared || {});
      setVendorData(data.project.vendor || null);

      // 更新共享数据，确保包含vendor_id
      const vendorId = data.project.vendor?.vendor_id || '';
      setSharedData({
        shared_key: data.shared?.shared_key || '',
        shared_password: data.shared?.shared_password || '',
        vendor: vendorId
      });

      // 关闭密码提示
      setIsPasswordPrompt(false);
      setError('');

      toast({
        title: "访问成功",
        description: "已成功访问供应商共享表格数据",
      });
    } catch (error: any) {
      console.error('访问供应商共享项目失败:', error);
      setError(error?.response?.data?.message || '密码不正确或连接失败，请重试！');
      toast({
        title: "访问失败",
        description: error?.response?.data?.message || "密码不正确或连接失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!sharedKey) {
    return null;
  }

  return (
    <>
      <Dialog open={isPasswordPrompt} onOpenChange={setIsPasswordPrompt}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>请输入供应商分享密码</DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit}>
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="请输入分享密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    验证中...
                  </>
                ) : '提交'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {!isPasswordPrompt && projectData && (
        <div className="h-screen flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-200 p-3 sm:p-4 flex items-center flex-shrink-0">
            <h1 className="text-lg sm:text-xl font-bold truncate">{projectData.name || '合作者分享表格'}</h1>
            {vendorData && (
              <div className="bg-primary-50 text-gray-500 text-primary-700 px-2 py-1 rounded-full flex items-center text-xs sm:text-sm ml-2">
                <UsergroupDeleteOutlined />
                合作者: {vendorData.name}
              </div>
            )}
          </header>

          <div className="flex-1 flex flex-col overflow-x-auto">
          {/* 表头固定 */}
          <div className="sticky top-0 z-10">
            <div className="flex bg-gray-50">
              {columns.map((column) => (
                <div
                  key={column.column_id}
                  className="border border-black p-1 sm:p-2 font-medium text-xs sm:text-sm bg-green-500 text-center flex-shrink-0"
                  style={{
                    minWidth: typeof window !== 'undefined' && window.innerWidth < 640
                      ? '100px'
                      : column.width,
                    width: typeof window !== 'undefined' && window.innerWidth < 640
                      ? '100px'
                      : column.width
                  }}
                >
                  {column.title}
                </div>
              ))}
            </div>
          </div>

          {/* 数据行 - 可垂直滚动 */}
          <div style={{ maxHeight: 'calc(100vh - 180px)' }}>
            {rows.length > 0 ? (
              rows.map((row) => (
                <div key={row.row_id} className="flex hover:bg-gray-50">
                  {columns.map((column) => {
                    const cell = row.cells.find((c: any) => c.column === column.column_id);
                    if (!cell) return (
                      <div
                        key={`${row.row_id}-${column.column_id}-empty`}
                        className="border-r border-b border-gray-200 p-1 sm:p-2 flex-shrink-0"
                        style={{
                          minWidth: typeof window !== 'undefined' && window.innerWidth < 640
                            ? '100px'
                            : column.width,
                          width: typeof window !== 'undefined' && window.innerWidth < 640
                            ? '100px'
                            : column.width
                        }}
                      ></div>
                    );

                    // 解析单元格样式
                    let cellStyle: { backgroundColor?: string; textColor?: string } = {};
                    try {
                      if (cell.style) {
                        cellStyle = typeof cell.style === 'string'
                          ? JSON.parse(cell.style)
                          : cell.style;
                      }
                    } catch (e) {
                      console.error('解析单元格样式失败:', e);
                    }

                    return (
                      <div
                        key={`${row.row_id}-${column.column_id}`}
                        className="border-r border-b border-gray-200 p-1 sm:p-2 text-xs sm:text-sm flex-shrink-0"
                        style={{
                          minWidth: typeof window !== 'undefined' && window.innerWidth < 640
                            ? '100px'
                            : column.width,
                          width: typeof window !== 'undefined' && window.innerWidth < 640
                            ? '100px'
                            : column.width,
                          backgroundColor: cellStyle.backgroundColor || 'transparent',
                          color: cellStyle.textColor || 'inherit',
                        }}
                      >
                        {renderCellContent(cell, column.type, projectData.base_url, sharedData, VendorNoteCell)}
                      </div>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                没有该供应商相关的数据
              </div>
            )}
          </div>
          </div>

          <footer className="bg-white border-t border-gray-200 p-3 sm:p-4 flex-shrink-0">
            <p className="text-xs sm:text-sm text-gray-500">此数据仅供查看，如需编辑请联系项目负责人。</p>
          </footer>
        </div>
      )}
    </>
  );
};