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
export const parseVendorNotes = (cell: Cell): VendorNote[] => {
  if (!cell.content) return [];
  
  // 如果已经是数组形式，直接返回
  if (Array.isArray(cell.content)) {
    return cell.content as VendorNote[];
  }
  
  // 尝试解析 JSON 字符串
  try {
    if (typeof cell.content === 'string') {
      return JSON.parse(cell.content);
    }
  } catch (e) {
    console.error("Error parsing vendor notes:", e);
  }
  
  return [];
}; 