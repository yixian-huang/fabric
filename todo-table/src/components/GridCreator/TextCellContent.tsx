
import React, { useRef, useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import type { Cell } from "./GridTypes";

interface TextCellContentProps {
  cell: Cell;
  isSelected: boolean;
  onUpdate: (content: string) => void;
}

/**
 * 文本单元格内容组件
 * 处理单元格内文本的显示和编辑
 */
export const TextCellContent: React.FC<TextCellContentProps> = ({
  cell,
  isSelected,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  // 将数组内容转换为字符串（如果需要）或处理Date类型
  const getContentAsString = (content: Cell['content']): string => {
    if (content instanceof Date) {
      return content.toISOString();
    } else if (Array.isArray(content)) {
      return content.join(", ");
    } else if (typeof content === 'string') {
      return content;
    }
    return String(content || "");
  };
  
  const contentAsString = getContentAsString(cell.content);
  const [editValue, setEditValue] = useState(contentAsString);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // 确保编辑值始终是最新的
    const updatedContent = getContentAsString(cell.content);
    setEditValue(updatedContent);
  }, [cell.content, isSelected]);

  // 双击处理 - 进入编辑模式
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  // 文本变更处理
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value);
  };

  // 失去焦点处理 - 保存更改
  const handleBlur = () => {
    if (isEditing) {
      onUpdate(editValue);
      setIsEditing(false);
    }
  };

  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(contentAsString);
    }
  };

  // 确保组件在设置为编辑模式后立即聚焦输入框
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // 计算文本的行数
  const calculateRows = (text: string) => {
    return Math.max(1, (text?.match(/\n/g)?.length || 0) + 1);
  };

  return isEditing ? (
    <Textarea
      ref={inputRef}
      className="h-full w-full border-0 bg-transparent outline-none text-sm p-0"
      style={{ fontFamily: "inherit", backgroundColor: "transparent", color: "inherit" }}
      value={editValue}
      onChange={handleTextChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      maxLength={cell.columnDefinition?.rule?.length}
      autoFocus
      rows={calculateRows(editValue)}
      onClick={(e) => e.stopPropagation()}
    />
  ) : (
    <div
      className="w-full h-full whitespace-pre-line break-words cursor-text"
      onDoubleClick={handleDoubleClick}
    >
      {contentAsString}
    </div>
  );
};
