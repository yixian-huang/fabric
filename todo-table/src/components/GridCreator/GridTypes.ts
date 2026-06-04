import { nanoid } from "nanoid";

// Define grid data types
export interface CellStyle {
  backgroundColor?: string;
  textColor?: string;
}

export interface FileData {
  name: string;
  url: string;
  file_id: string;
}

export interface VendorTag {
  id: string;
  name: string;
}

export interface VendorNote {
  vendorId: string;
  content: string;
}

export interface Cell {
  id?: string;
  row: string;
  column?: string;
  content: string | string[] | VendorTag[] | VendorNote[] | (string | VendorTag)[] | Date;
  style?: CellStyle;
  type?: "text" | "image" | "file" | "vendor" | "vendorNote" | "date";
  files?: FileData[];
  columnDefinition?: GridColumn;
}

export interface GridRow {
  id: string;
  row_id: string;
  cells: Cell[];
  isSelected: boolean;
  hidden?: boolean;
}

export interface GridColumn {
  id: string;
  title: string;
  width: number;
  type?: "text" | "image" | "file" | "vendor" | "date" | "vendorNote";
  style?: {
    fixed?: boolean;
    maxWidth?: number;
  };
  rule?: {
    length?: number;
  };
}

export interface ShareInfo {
  link: string;
  password: string;
  selectedRows: string[];
  expiresAt: Date;
  vendor?: string;
}

export interface CellPos { 
  rowIndex: number; 
  columnIndex: number; 
}
