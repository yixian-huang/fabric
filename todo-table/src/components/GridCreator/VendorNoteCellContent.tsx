import React, { useState, useMemo } from 'react';
import { Cell, VendorTag, VendorNote } from './GridTypes';
import { useGridContext } from './GridContextHooks';
import { parseVendorTags, parseVendorNotes } from './utils/vendorUtils';
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";

interface VendorNoteCellContentProps {
  cell: Cell;
  rowIndex: number;
  onUpdate: (notes: VendorNote[]) => void;
}

export const VendorNoteCellContent: React.FC<VendorNoteCellContentProps> = ({
  cell,
  rowIndex,
  onUpdate,
}) => {
  const { rows } = useGridContext();
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');

  // Get vendors from the vendor cell in the same row
  const rowVendors = useMemo(() => {
    const row = rows[rowIndex];
    if (!row) return [];
    
    const vendorCell = row.cells.find(cell => cell.type === 'vendor');
    if (!vendorCell) return [];
    
    return parseVendorTags(vendorCell);
  }, [rows, rowIndex]);

  // Get notes for each vendor
  const notes = useMemo(() => {
    return parseVendorNotes(cell);
  }, [cell]);

  const handleNoteChange = (vendorId: string, content: string) => {
    const updatedNotes = [...notes];
    const noteIndex = updatedNotes.findIndex(note => note.vendorId === vendorId);
    
    if (noteIndex >= 0) {
      updatedNotes[noteIndex] = { vendorId, content };
    } else {
      updatedNotes.push({ vendorId, content });
    }
    
    onUpdate(updatedNotes);
  };

  const getNoteForVendor = (vendorId: string) => {
    return notes.find(note => note.vendorId === vendorId)?.content || '';
  };

  const startEditing = (vendorId: string) => {
    setEditingContent(getNoteForVendor(vendorId));
    setEditingVendorId(vendorId);
  };

  const finishEditing = (vendorId: string) => {
    handleNoteChange(vendorId, editingContent);
    setEditingVendorId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, vendorId: string) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      finishEditing(vendorId);
    }
  };

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-2 p-1">
        {rowVendors.map((vendor) => (
          <div key={vendor.id} className="space-y-1 border-b border-gray-200 pb-1">
            <div className="text-sm font-medium text-gray-700">{vendor.name}</div>
            {editingVendorId === vendor.id ? (
              <Textarea
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                onBlur={() => finishEditing(vendor.id)}
                onKeyDown={(e) => handleKeyDown(e, vendor.id)}
                className="min-h-[60px] w-full text-sm"
                autoFocus
                placeholder="输入备注内容，Ctrl+Enter 提交"
              />
            ) : (
              <div
                className="min-h-[20px] text-sm whitespace-pre-wrap cursor-text text-gray-400"
                onClick={() => startEditing(vendor.id)}
              >
                {getNoteForVendor(vendor.id) || '点击添加备注'}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
