import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast, useToast } from '@/hooks/use-toast';
import { VendorTag } from './GridTypes';
import { accessSharedProject, updateVendorRemark } from '@/lib/projectService';
import { Loader2 } from 'lucide-react';
import { log } from 'console';
import api from '@/lib/api';
import { VendorNoteCell } from './VendorNoteCell';

interface Shared {
  shared_key: string;
  shared_password: string;
  vendor?: string;
}

export const SharedView: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
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
  const [sharedData, setSharedData] = useState<Shared>({ shared_key: '', shared_password: '' });
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

  // 提取 vendor 过滤参数
  const [vendorFilter, setVendorFilter] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const vendorParam = params.get('vendor');
    if (vendorParam) {
      setVendorFilter(vendorParam);
    }
  }, [location.search]);

  const handlePasswordSubmit = async (e?: React.FormEvent | null, passParam?: string) => {
    if (e) e.preventDefault();
    
    if (!shareId) {
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
      const data = await accessSharedProject(shareId, passwordToUse);
      
      // 设置项目数据
      setProjectData(data.project);
      setColumns(data.project.columns || []);
      setRows(data.project.rows || []);
      setSharedData(data.shared || {});
      
      // 关闭密码提示
      setIsPasswordPrompt(false);
      setError('');
      
      toast({
        title: "访问成功",
        description: "已成功访问共享表格数据",
      });
    } catch (error: any) {
      console.error('访问共享项目失败:', error);
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

  // 根据供应商过滤行
  const filteredRows = vendorFilter 
    ? rows.filter(row => {
        const vendorCol = columns.find(col => col.type === 'vendor');
        if (!vendorCol) return true;
        
        const vendorCell = row.cells.find(cell => cell.column === vendorCol.column_id);
        if (!vendorCell || !vendorCell.content) return false;
        
        try {
          const vendors = JSON.parse(vendorCell.content);
          return vendors.some((v: any) => v.name === vendorFilter);
        } catch {
          return false;
        }
      }) 
    : rows;

  if (!shareId) {
    return null;
  }

  return (
    <>
      <Dialog open={isPasswordPrompt} onOpenChange={setIsPasswordPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>请输入分享密码</DialogTitle>
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
              <Button type="submit" disabled={isLoading}>
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
        <div className="min-h-screen flex flex-col">
          <header className="bg-white border-b border-gray-200 p-4">
            <h1 className="text-xl font-bold">{projectData.name || '分享的表格数据'}</h1>
            {vendorFilter && (
              <p className="text-sm text-gray-500 mt-1">供应商: {vendorFilter}</p>
            )}
          </header>
          
          <div className="flex-1 overflow-auto">
            <div className="border-b border-gray-200">
              <div className="flex border-b border-gray-200 bg-gray-50">
                {columns.map((column) => (
                  <div
                    key={column.column_id}
                    className="border-r border-gray-200 p-2 font-medium text-sm"
                    style={{ width: column.width }}
                  >
                    {column.title}
                  </div>
                ))}
              </div>
              
              {filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <div key={row.row_id} className="flex hover:bg-gray-50">
                    {columns.map((column) => {
                      const cell = row.cells.find((c: any) => c.column === column.column_id);
                      if (!cell) return (
                        <div 
                          key={`${row.row_id}-${column.column_id}-empty`}
                          className="border-r border-b border-gray-200 p-2"
                          style={{ width: column.width }}
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
                          className="border-r border-b border-gray-200 p-2"
                          style={{
                            width: column.width,
                            backgroundColor: cellStyle.backgroundColor || 'transparent',
                            color: cellStyle.textColor || 'inherit',
                          }}
                        >
                          {renderCellContent(cell, column.type, projectData.base_url, sharedData)}
                        </div>
                      );
                    })}
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  没有符合条件的数据
                </div>
              )}
            </div>
          </div>
          
          <footer className="bg-white border-t border-gray-200 p-4">
            <p className="text-sm text-gray-500">此数据仅供查看，如需编辑请联系分享者。</p>
          </footer>
        </div>
      )}
    </>
  );
};

// 渲染单元格内容
const renderCellContent = (cell: any, columnType: string, baseUrl: string, shared: Shared) => {
  // 如果没有内容，返回空
  if (!cell || !cell.content) return null;
  
  let content = cell.content;
  
  // 处理JSON字符串内容
  if (typeof content === 'string' && (content.startsWith('[') || content.startsWith('{'))) {
    try {
      content = JSON.parse(content);
    } catch (e) {
      // 解析失败，维持原始字符串
    }
  }
  
  switch (columnType) {
    case 'image':
      if (Array.isArray(content)) {
        const imageUrl = `${baseUrl}/${content[0].url}`
        return (
          <img
          src={imageUrl}
          alt="图片"
          className="max-h-16 max-w-full object-contain"
        />
        )
      }
      return null;
    case 'file':
      if (Array.isArray(content)) {
        return (
          <div className="flex flex-col gap-1">
            {content.map((file: any, i: number) => (
              <a
                key={i}
                href={`${baseUrl}/${file.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline"
              >
                {file.name || "查看文件"}
              </a>
            ))}
          </div>
        );
      }
      return null;
      
    case 'vendor':
      if (Array.isArray(content)) {
        return (
          <div className="flex flex-wrap gap-1">
            {content.map((vendor: any, i: number) => (
              <span key={i} className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                {vendor.name}
              </span>
            ))}
          </div>
        );
      }
      return content;
      
    case 'date':
      // 处理日期格式
      if (content) {
        try {
          const date = new Date(content);
          return date.toLocaleDateString();
        } catch (e) {
          return content;
        }
      }
      return content;

    case 'vendorNote':
      return <VendorNoteCell shared={shared} cell={cell} content={content} />;
      
    default:
      return typeof content === 'string' ? content : 
             Array.isArray(content) ? content.map((item: any) => 
               typeof item === 'string' ? item : item.name).join(", ") : 
             JSON.stringify(content);
  }
};
