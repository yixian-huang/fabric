// 类型定义
export interface CellData {
    type: "text" | "image" | "file";
    value: string;
    fileName?: string;
    textColor?: string;
    bgColor?: string;
  }
  export interface Column {
    id: string;
    title: string;
    width: number;
  }
  export interface Row {
    id: string;
    data: Record<string, CellData>;
  }
  export interface SelectedCell {
    rowIndex: number;
    colIndex: number;
  }
  export interface ContextMenu {
    show: boolean;
    type: "cell" | "column" | "row";
    x: number;
    y: number;
    rowIndex: number;
    colIndex: number;
  }
  export interface ShareDialog {
    show: boolean;
    permission: "view" | "edit";
    expiry: string;
    link: string;
  }
  export interface ColumnRenameDialog {
    show: boolean;
    colIndex: number;
    value: string;
  }
  export interface HistoryState {
    columns: Column[];
    rows: Row[];
  }