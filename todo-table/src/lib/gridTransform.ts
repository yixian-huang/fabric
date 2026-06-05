import { Cell, CellStyle, GridColumn, GridRow } from '@/components/GridCreator/GridTypes';
import type { ProjectDetail } from '@/lib/projectService';

export interface ApiColumn {
  column_id: string;
  title: string;
  column_index: number;
  width?: number;
  type?: string;
  style?: string;
  rule?: string;
  style_data?: Record<string, unknown>;
  rule_data?: Record<string, unknown>;
}

export interface ApiCell {
  cell_id?: string;
  content?: string;
  row: string;
  column: string;
  type?: string;
  style?: string;
  style_data?: Record<string, unknown>;
}

export interface ApiRow {
  row_id: string;
  row_index: number;
  hidden?: boolean;
  cells: ApiCell[];
}

/** 解析 JSON 字符串或返回已有对象 */
export function resolveJsonObject<T extends Record<string, unknown>>(
  raw: string | Record<string, unknown> | undefined | null,
  fallback: T = {} as T
): T {
  if (raw == null) return fallback;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return Object.keys(raw).length > 0 ? (raw as T) : fallback;
  }
  if (typeof raw !== 'string' || raw.trim() === '') return fallback;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as T)
      : fallback;
  } catch {
    return fallback;
  }
}

export function resolveCellStyle(
  style?: string,
  styleData?: Record<string, unknown>
): CellStyle {
  if (styleData && Object.keys(styleData).length > 0) {
    return styleData as CellStyle;
  }
  return resolveJsonObject<CellStyle>(style, {});
}

function parseCellFiles(content: string | undefined, type: string | undefined): unknown[] {
  if (!content || type === 'text' || type === 'date' || type === 'vendorNote') {
    return [];
  }
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function buildColumnMap(columns: GridColumn[]): Map<string, GridColumn> {
  return new Map(columns.map((col) => [col.id, col]));
}

export function mapApiColumnToGridColumn(col: ApiColumn): GridColumn {
  return {
    id: col.column_id,
    title: col.title,
    width: col.width || 100,
    type: (col.type as GridColumn['type']) || 'text',
    style: resolveJsonObject(col.style_data ?? col.style, {}),
    rule: resolveJsonObject(col.rule_data ?? col.rule, {}),
  };
}

export function mapApiColumnsToGridColumns(columns: ApiColumn[]): GridColumn[] {
  return [...columns]
    .sort((a, b) => a.column_index - b.column_index)
    .map(mapApiColumnToGridColumn);
}

export function mapApiCellToGridCell(
  cell: ApiCell,
  columnMap: Map<string, GridColumn>
): Cell {
  const cellType = (cell.type as Cell['type']) || 'text';
  return {
    id: cell.cell_id,
    content: cell.content ?? '',
    type: cellType,
    style: resolveCellStyle(cell.style, cell.style_data),
    files: parseCellFiles(cell.content, cell.type) as Cell['files'],
    row: cell.row,
    column: cell.column,
    columnDefinition: columnMap.get(cell.column),
  };
}

export function mapApiRowToGridRow(row: ApiRow, columnMap: Map<string, GridColumn>): GridRow {
  return {
    id: row.row_id,
    row_id: row.row_id,
    isSelected: false,
    hidden: row.hidden,
    cells: row.cells.map((cell) => mapApiCellToGridCell(cell, columnMap)),
  };
}

export function mapApiRowsToGridRows(
  rows: ApiRow[],
  columns: GridColumn[]
): GridRow[] {
  const columnMap = buildColumnMap(columns);
  return [...rows]
    .sort((a, b) => a.row_index - b.row_index)
    .map((row) => mapApiRowToGridRow(row, columnMap));
}

export function mapProjectDetailToGridState(data: ProjectDetail): {
  columns: GridColumn[];
  rows: GridRow[];
} {
  const columns = mapApiColumnsToGridColumns(data.columns ?? []);
  const columnMap = buildColumnMap(columns);
  const rows = [...(data.rows ?? [])]
    .sort((a, b) => a.row_index - b.row_index)
    .map((row) => mapApiRowToGridRow(row as ApiRow, columnMap));
  return { columns, rows };
}
