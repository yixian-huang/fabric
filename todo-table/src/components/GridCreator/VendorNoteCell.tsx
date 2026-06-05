import React, { useMemo, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { updateVendorRemark as updateSharedVendorRemark } from '@/lib/projectService';
import { updateVendorRemark as updateVendorShareRemark } from '@/lib/cellsService';
import { parseVendorNotes } from './utils/vendorUtils';

interface VendorNoteCellProps {
  shared: {
    shared_key: string;
    shared_password: string;
    vendor?: string;
  };
  cell: { row: string; column: string; content?: string };
  content: unknown;
  /** 普通行分享用 shared，供应商专属分享用 vendor-share */
  remarkApi?: 'shared' | 'vendor-share';
}

/**
 * 供应商备注组件（共享视图只读/可编辑）
 */
export const VendorNoteCell: React.FC<VendorNoteCellProps> = ({
  shared,
  cell,
  content,
  remarkApi = 'shared',
}) => {
  const notes = useMemo(() => {
    const source =
      typeof content === 'string' || Array.isArray(content) || (content && typeof content === 'object')
        ? content
        : cell.content;
    return parseVendorNotes({ content: source } as { content: string });
  }, [cell.content, content]);

  const primaryNote = notes[0];
  const [noteContent, setNoteContent] = useState(primaryNote?.content || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    try {
      const vendorId = primaryNote?.vendorId || shared?.vendor || '';
      const saveRemark =
        remarkApi === 'vendor-share' ? updateVendorShareRemark : updateSharedVendorRemark;

      await saveRemark(
        shared.shared_key,
        shared.shared_password,
        cell.row,
        cell.column,
        vendorId,
        noteContent
      );
      setIsEditing(false);
      toast({
        title: '保存成功',
        description: '供应商备注已保存',
      });
    } catch (error) {
      console.error('保存供应商备注失败:', error);
      toast({
        title: '保存失败',
        description: '供应商备注保存失败',
        variant: 'destructive',
      });
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          className="w-full p-2 border rounded-md min-h-[80px]"
          placeholder="请输入备注内容..."
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1 text-sm bg-gray-200 rounded-md"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md"
          >
            保存
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-2 border border-dashed rounded-md cursor-pointer hover:bg-gray-50"
      onClick={() => setIsEditing(true)}
    >
      {noteContent ? noteContent : <span className="text-gray-400">点击添加备注</span>}
    </div>
  );
};
