import { GridColumn, GridRow, Cell, CellStyle, ShareInfo, CellPos, FileData, VendorTag } from "./GridTypes";
import { Vendor } from "@/lib/projectService";

export interface GridContextType {
  columns: GridColumn[];
  rows: GridRow[];
  selectedCells: CellPos[];
  shareInfo: ShareInfo | null;
  vendorLinks: Map<string, string>;
  selectedRowsCount: number;
  loading: boolean;
  
  // 供应商相关状态
  vendors: Vendor[];
  setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
  vendorsLoading: boolean;

  setColumns: React.Dispatch<React.SetStateAction<GridColumn[]>>;
  setRows: React.Dispatch<React.SetStateAction<GridRow[]>>;

  addRow: () => void;
  toggleRowSelection: (rowId: string) => void;
  deleteSelectedRows: () => void;
  selectAllRows: (selected: boolean) => void;
  hideSelectedRows: () => void;
  restoreHiddenRow: (row: GridRow) => void;

  addColumn: () => void;
  updateColumnTitle: (columnId: string, title: string) => void;
  updateColumnWidth: (columnId: string, width: number) => void;
  updateColumnStyle: (columnId: string, style: GridColumn['style']) => void;
  updateColumnRule: (columnId: string, rule: GridColumn['rule']) => void;
  deleteColumn: (columnId: string) => void;

  updateCellContent: (rowId: string, columnIndex: number, content: string) => void;
  updateCellStyle: (rowId: string, columnIndex: number, style: CellStyle) => void;
  uploadCellFile: (rowId: string, columnIndex: number, file: File) => void;
  removeCellFile: (rowId: string, columnIndex: number, fileIndex: number) => void;
  toggleCellSelection: (rowIndex: number, columnIndex: number, options?: { shiftKey?: boolean }) => void;
  setSelectedCells: (cells: CellPos[]) => void;
  clearCellSelection: () => void;
  isCellSelected: (rowIndex: number, columnIndex: number) => boolean;
  applyStyleToSelectedCells: (style: CellStyle) => void;
  clearAllCellStyle: () => void;
  
  isUploading: (rowId: string, columnIndex: number) => boolean;

  generateShareLink: () => Promise<void>;
  clearShareInfo: () => void;

  extractVendors: (rows: GridRow[]) => VendorTag[];
  getUniqueVendorsForCell: (allVendors: VendorTag[], currentVendors: VendorTag[]) => VendorTag[];
  
  // 项目ID相关状态和方法
  projectId?: string;
  setProjectId: React.Dispatch<React.SetStateAction<string | undefined>>;
}

export type {
  GridColumn, GridRow, Cell, CellStyle, ShareInfo, CellPos, FileData, VendorTag
};
