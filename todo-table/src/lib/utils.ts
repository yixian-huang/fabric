import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react"
import { Image } from "antd"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 通用的单元格内容渲染函数
export const renderCellContent = (
  cell: any, 
  columnType?: string, 
  baseUrl?: string, 
  shared?: { shared_key: string; shared_password: string; vendor?: string },
  VendorNoteCellComponent?: React.ComponentType<any>
): React.ReactNode => {
  // 如果没有内容，返回空
  if (!cell) return null;
  let content = cell.content;

  // 处理JSON字符串内容
  if (typeof content === 'string' && (content.startsWith('[') || content.startsWith('{'))) {
    try {
      content = JSON.parse(content);
    } catch (e) {
      // 解析失败，维持原始字符串
    }
  }

  // 如果没有指定列类型，使用简单的渲染逻辑
  if (!columnType) {
    if (typeof content === "string" || content instanceof Date) {
      return content instanceof Date ? content.toLocaleDateString() : content;
    }
    if (Array.isArray(content)) {
      // Check if it's VendorNote[]
      if (content.length > 0 && typeof (content[0] as any).content === 'string' && typeof (content[0] as any).vendorId === 'string') {
        return (content as any[]).map(item => item.content).join(", ");
      }
      // Check if it's (string | VendorTag)[] or VendorTag[]
      if (content.length > 0 && 
          (typeof content[0] === 'string' || (typeof (content[0] as any).name === 'string' && typeof (content[0] as any).id === 'string'))) {
        return (content as any[]).map(item => typeof item === 'string' ? item : item.name).join(", ");
      }
    }
    return "-"; // Default fallback
  }

  // 使用详细的类型处理逻辑
  switch (columnType) {
    case 'image':
      if (Array.isArray(content) && baseUrl) {
        const imageUrl = content[0]?.url ? `${baseUrl}/${content[0].url}` : '';
        return imageUrl ? React.createElement(Image, {
          src: imageUrl,
          alt: "图片",
          wrapperClassName: "w-full h-full flex items-center justify-center",
          style: { maxHeight: '128px', objectFit: 'contain', width: 'auto', margin: '0 auto' },
          preview: { maskClassName: 'customize-mask' },
          placeholder: React.createElement('div', 
            { className: "flex items-center justify-center w-full h-full bg-gray-100" },
            React.createElement('span', { className: "text-xs text-gray-400" }, "加载中...")
          )
        }) : null;
      }
      return null;

    case 'file':
      if (Array.isArray(content) && baseUrl) {
        return React.createElement('div', 
          { className: "flex flex-col gap-1" },
          content.map((file: any, i: number) => 
            React.createElement('a', {
              key: i,
              href: `${baseUrl}/${file.url}`,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "text-blue-500 underline text-xs sm:text-sm truncate max-w-[120px] sm:max-w-full"
            }, file.name || "查看文件")
          )
        );
      }
      return null;

    case 'vendor':
      if (Array.isArray(content)) {
        return React.createElement('div',
          { className: "flex flex-wrap gap-1" },
          content.map((vendor: any, i: number) =>
            React.createElement('span', {
              key: i,
              className: "px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-100 rounded-full text-xxs sm:text-xs truncate max-w-[100px] sm:max-w-full"
            }, vendor.name)
          )
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
      if (VendorNoteCellComponent && shared) {
        return React.createElement(VendorNoteCellComponent, { shared, cell, content });
      }
      // 如果没有提供 VendorNoteCell 组件或 shared 数据，显示简单文本
      if (Array.isArray(content) && content.length > 0) {
        return content.map((item: any) => item.content).join(", ");
      }
      return content;

    default:
      const displayContent = typeof content === 'string' ? content :
        Array.isArray(content) ? content.map((item: any) =>
          typeof item === 'string' ? item : item.name).join(", ") :
          JSON.stringify(content);

      // 如果内容过长，允许文本换行而不是截断
      return React.createElement('div', {
        className: "break-words whitespace-pre-wrap max-w-[120px] sm:max-w-full"
      }, displayContent);
  }
};
