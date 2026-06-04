import React from "react";
import { GridProvider as OriginalGridProvider } from "./GridContextProvider";

interface GridProviderProps {
  children: React.ReactNode;
  projectId: string;
}

/**
 * 增强的Grid上下文提供者组件，添加了项目ID参数
 */
export const GridProvider: React.FC<GridProviderProps> = ({ children, projectId }) => {
  // 这里可以根据项目ID加载初始数据
  
  return (
    <OriginalGridProvider projectId={projectId}>
      {children}
    </OriginalGridProvider>
  );
}; 