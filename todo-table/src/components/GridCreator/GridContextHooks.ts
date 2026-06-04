
import React, { useContext } from "react";
import { GridContext } from "./GridContextProvider";
import type { GridContextType } from "./GridContextTypes";

/**
 * 使用Grid上下文的Hook
 * @returns Grid上下文值
 * @throws 如果在GridProvider外部使用则抛出错误
 */
export function useGridContext(): GridContextType {
  const context = useContext(GridContext);
  if (context === undefined) {
    throw new Error("useGridContext必须在GridProvider内部使用");
  }
  return context;
}
