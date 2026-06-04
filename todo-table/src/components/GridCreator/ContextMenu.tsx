import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ContextMenuProps {
  show: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onClearContent: () => void;
  onSetTextColor: (color: string) => void;
  onSetBgColor: (color: string) => void;
  onUploadImage?: () => void;
  onUploadFile?: () => void;
  columnType?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  show,
  x,
  y,
  onClose,
  onClearContent,
  onSetTextColor,
  onSetBgColor,
  onUploadImage,
  onUploadFile,
  columnType,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ left: x, top: y });
  
  // 当菜单显示或位置变化时，计算最佳显示位置
  useEffect(() => {
    if (show) {
      // 初始位置即为鼠标点击的位置
      let left = x;
      let top = y;
      
      // 获取视窗大小
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // 当菜单元素可用时，调整位置以避免溢出
      if (menuRef.current) {
        const menuRect = menuRef.current.getBoundingClientRect();
        
        // 检查右边界，如果菜单超出屏幕右侧，则向左调整
        if (x + menuRect.width > viewportWidth) {
          left = Math.max(0, viewportWidth - menuRect.width);
        }
        
        // 检查下边界，如果菜单超出屏幕底部，则向上调整
        if (y + menuRect.height > viewportHeight) {
          top = Math.max(0, viewportHeight - menuRect.height);
        }
      }
      
      setMenuPosition({ left, top });
    }
  }, [show, x, y]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [show, onClose]);

  if (!show) return null;

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed bg-white shadow-lg rounded-md border border-gray-200 z-[9999]"
      style={{
        left: `${menuPosition.left}px`,
        top: `${menuPosition.top}px`,
        minWidth: '160px',
      }}
    >
      <div className="py-1">
        <button
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
          onClick={onClearContent}
        >
          <span className="mr-2">🗑️</span>
          清除内容
        </button>
        
        {columnType === 'image' && onUploadImage && (
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
            onClick={onUploadImage}
          >
            <span className="mr-2">📷</span>
            上传图片
          </button>
        )}
        
        {columnType === 'file' && onUploadFile && (
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
            onClick={onUploadFile}
          >
            <span className="mr-2">📎</span>
            上传文件
          </button>
        )}
        
        <div className="border-t border-gray-200 my-1"></div>
        
        <div className="px-4 py-2 text-sm">
          <div className="mb-2">文字颜色</div>
          <div className="flex space-x-2">
            {[
              { color: 'inherit', hasBorder: true },
              { color: "#000000e6", label: "黑色" },
              { color: "#ea384c", label: "红色" },
              { color: "#1EAEDB", label: "蓝色" },
              { color: "#3FD048", label: "绿色" },
              { color: "#FECA2B", label: "黄色" },
              { color: "#9b87f5", label: "紫色" },
            ].map((item, index) => (
              <button
                key={index}
                className={`w-6 h-6 rounded-full ${item.hasBorder ? 'border border-gray-200' : ''}`}
                style={{ backgroundColor: item.color }}
                onClick={() => onSetTextColor(item.color)}
              ></button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 my-1"></div>
        
        <div className="px-4 py-2 text-sm">
          <div className="mb-2">背景颜色</div>
          <div className="flex space-x-2">
              {[
                { color: 'transparent', hasBorder: true },
                { color: "#FFDEE2" },
                { color: "#D3E4FD" },
                { color: "#F2FCE2" },
                { color: "#FDFDDE" },
                { color: "#FEF7CD" },
                { color: "#F5EDFF" }
              ].map((item, index) => (
                <button
                  key={index}
                  className={`w-6 h-6 rounded-full ${item.hasBorder ? 'border border-gray-200' : ''}`}
                  style={{ backgroundColor: item.color }}
                  onClick={() => onSetBgColor(item.color)}
                ></button>
              ))}
          </div>
        </div>
        
        <div className="border-t border-gray-200 my-1"></div>
        
        <button
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
          onClick={onClose}
        >
          <span className="mr-2">❌</span>
          关闭
        </button>
      </div>
    </div>
  );

  // 使用createPortal将菜单渲染到body元素中
  return createPortal(menuContent, document.body);
}; 