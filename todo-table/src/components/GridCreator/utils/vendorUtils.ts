import { Cell, VendorTag, VendorNote } from '../GridTypes';

/**
 * 从单元格内容解析供应商标签
 * @param cellContent 单元格内容
 * @returns 解析后的供应商标签数组
 */
export const parseVendorTags = (cell: Cell): VendorTag[] => {
  if (!cell.content) return [];

  if (Array.isArray(cell.content)) {
    if (typeof cell.content[0] === 'string' && cell.content[0].includes('{')) {
      try {
        return cell.content.map(item => 
          typeof item === 'string' ? JSON.parse(item) : item
        );
      } catch (e) {
        console.error("Error parsing vendor data:", e);
        return [];
      }
    }
    return cell.content as VendorTag[];
  }

  try {
    if (typeof cell.content === 'string' && cell.content.startsWith('[')) {
      return JSON.parse(cell.content);
    }
  } catch (e) {
    console.error("Error parsing cell content:", e);
  }
  
  return [];
};

/**
 * 从单元格内容解析供应商注释
 * @param cell 单元格
 * @returns 解析后的供应商注释数组
 */
function normalizeVendorNotes(parsed: unknown): VendorNote[] {
  if (!parsed) return [];
  if (Array.isArray(parsed)) {
    return parsed
      .filter((item): item is VendorNote => !!item && typeof item === 'object' && 'vendorId' in item)
      .map((item) => ({
        vendorId: String(item.vendorId),
        content: String(item.content ?? ''),
      }));
  }
  if (typeof parsed === 'object' && parsed !== null && 'vendorId' in parsed) {
    const note = parsed as VendorNote;
    return [{ vendorId: String(note.vendorId), content: String(note.content ?? '') }];
  }
  return [];
}

export const parseVendorNotes = (cell: Cell): VendorNote[] => {
  if (!cell.content) return [];

  if (Array.isArray(cell.content)) {
    return normalizeVendorNotes(cell.content);
  }

  if (typeof cell.content === 'object') {
    return normalizeVendorNotes(cell.content);
  }

  try {
    if (typeof cell.content === 'string' && cell.content.trim()) {
      return normalizeVendorNotes(JSON.parse(cell.content));
    }
  } catch (e) {
    console.error("Error parsing vendor notes:", e);
  }

  return [];
}; 