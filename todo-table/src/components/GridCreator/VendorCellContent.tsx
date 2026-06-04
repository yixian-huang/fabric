import React, { useState, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tag, Plus, X } from 'lucide-react';
import { Cell, VendorTag } from './GridTypes';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useGridContext } from './GridContextHooks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseVendorTags } from './utils/vendorUtils';
import { createVendor } from '@/lib/projectService';
import { toast } from '@/components/ui/use-toast';

interface VendorCellContentProps {
  cell: Cell;
  onUpdate: (content: VendorTag[]) => void;
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
  existingVendors?: VendorTag[]; // Added this property to match what's being passed in GridCell.tsx
}

export const VendorCellContent: React.FC<VendorCellContentProps> = ({
  cell,
  onUpdate,
  isEditing,
  onEditingChange,
  existingVendors = []
}) => {
  const { vendors, vendorsLoading, setVendors } = useGridContext();
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Parse vendors from cell content
  const cellVendors = useMemo(() => {
    return parseVendorTags(cell);
  }, [cell]);

  // 优先使用数据库供应商，其次使用父组件传入的候选列表
  const allVendors = useMemo(() => {
    const dbVendorTags = vendors.map(v => ({
      id: v.vendor_id,
      name: v.name
    }));

    const source = dbVendorTags.length > 0 ? dbVendorTags : existingVendors;
    const uniqueVendorMap = new Map<string, VendorTag>();

    for (const vendor of source) {
      const key = vendor.name.trim().toLowerCase();
      if (!key) continue;
      uniqueVendorMap.set(key, vendor);
    }

    return Array.from(uniqueVendorMap.values());
  }, [vendors, existingVendors]);

  // Get unique vendors not in current cell, filtering by name
  const uniqueExistingVendors = useMemo(() => {
    const currentVendorNames = new Set(cellVendors.map(v => v.name.toLowerCase()));
    return allVendors.filter(v => !currentVendorNames.has(v.name.toLowerCase()));
  }, [allVendors, cellVendors]);

  // Check if a vendor name already exists in the current cell
  const vendorExists = useCallback((name: string) => {
    return cellVendors.some(v => v.name.toLowerCase() === name.toLowerCase());
  }, [cellVendors]);

  // Get all unique vendor names for suggestions, excluding ones already in this cell
  const availableSuggestions = useMemo(() => {
    return allVendors
      .filter(v => !cellVendors.some(cv => cv.name.toLowerCase() === v.name.toLowerCase()))
      .map(v => v.name);
  }, [allVendors, cellVendors]);

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    return availableSuggestions.filter(name => 
      name.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [availableSuggestions, inputValue]);

  // Add a new vendor when Enter is pressed or suggestion is selected
  const addNewVendor = async (vendorName: string) => {
    const trimmedName = vendorName.trim();
    if (!trimmedName) return;
    
    if (vendorExists(trimmedName)) {
      console.log("供应商已存在，不添加重复:", trimmedName);
      return;
    }
    
    try {
      setLoading(true);
      
      // 查找数据库中是否已存在该供应商
      const existingVendor = vendors.find(v => 
        v.name.toLowerCase() === trimmedName.toLowerCase()
      );
      
      let vendorId: string;
      
      if (existingVendor) {
        // 如果已存在，使用现有供应商ID
        vendorId = existingVendor.vendor_id;
      } else {
        // 否则创建新供应商
        const newDbVendor = await createVendor(trimmedName);
        vendorId = newDbVendor.vendor_id;
        
        // 更新全局供应商列表
        setVendors(prev => [...prev, newDbVendor]);
      }
      
      // 创建新的供应商标签
      const newVendor: VendorTag = {
        id: vendorId,
        name: trimmedName
      };
      
      // 更新单元格内容
      const updatedVendors = [...cellVendors, newVendor];
      onUpdate(updatedVendors);
      setInputValue('');
      
    } catch (error) {
      console.error("创建供应商失败:", error);
      toast({ 
        title: '创建供应商失败', 
        description: '请稍后再试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation(); // Stop event propagation to prevent conflicts
    
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission if in a form
      addNewVendor(inputValue);
    } else if (e.key === 'Escape') {
      setShowInput(false);
      setInputValue('');
      setOpen(false);
    }
  };

  const handleRemoveVendor = useCallback((e: React.MouseEvent, vendorId: string) => {
    e.stopPropagation();
    const updatedVendors = cellVendors.filter(v => v.id !== vendorId);
    onUpdate(updatedVendors);
    console.log("移除供应商:", vendorId, "更新后供应商:", updatedVendors);
  }, [cellVendors, onUpdate]);

  const handleAddExistingVendor = useCallback((vendorId: string) => {
    const vendorToAdd = allVendors.find(v => v.id === vendorId);
    if (vendorToAdd && !vendorExists(vendorToAdd.name)) {
      const updatedVendors = [...cellVendors, vendorToAdd];
      onUpdate(updatedVendors);
      console.log("添加现有供应商:", vendorToAdd, "更新后供应商:", updatedVendors);
    }
  }, [cellVendors, allVendors, onUpdate, vendorExists]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditingChange(true);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setOpen(value.length > 0 && filteredSuggestions.length > 0);
  };

  // Handle selection from dropdown
  const handleSelect = (selectedValue: string) => {
    addNewVendor(selectedValue);
    setShowInput(false);
  };

  return (
    <div className="flex flex-col gap-2" onDoubleClick={handleDoubleClick}>
      <div className="flex flex-wrap gap-2">
        {cellVendors.map((vendor) => (
          <Badge
            key={vendor.id}
            variant="secondary"
            className="flex items-center gap-1 pr-1 cursor-default group"
          >
            <Tag size={14} />
            <span>{vendor.name.toUpperCase()}</span>
            <button
              className="ml-1 rounded-full hover:bg-destructive hover:text-destructive-foreground p-0.5"
              onClick={(e) => handleRemoveVendor(e, vendor.id)}
            >
              <X size={12} />
            </button>
          </Badge>
        ))}
      </div>
      
      <div className="flex gap-2 items-center">
        {showInput ? (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="输入供应商名称"
                className="flex-1 h-8 text-sm"
                autoFocus
                disabled={loading || vendorsLoading}
                onBlur={() => {
                  // Small delay to allow click events on the popover to fire first
                  setTimeout(() => {
                    if (!inputValue.trim()) {
                      setShowInput(false);
                    }
                    setOpen(false);
                  }, 200);
                }}
              />
            </PopoverTrigger>
            {filteredSuggestions.length > 0 && (
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandList>
                    <CommandEmpty>未找到供应商</CommandEmpty>
                    <CommandGroup>
                      {filteredSuggestions.map((name) => (
                        <CommandItem
                          key={name}
                          value={name}
                          onSelect={handleSelect}
                        >
                          <Tag className="mr-2 h-4 w-4" />
                          {name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            )}
          </Popover>
        ) : (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2"
              disabled={loading || vendorsLoading}
              onClick={(e) => {
                e.stopPropagation();
                setShowInput(true);
              }}
            >
              <Plus size={16} />
            </Button>
            
            {uniqueExistingVendors.length > 0 && (
              <Select onValueChange={handleAddExistingVendor} disabled={loading || vendorsLoading}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder={<Tag size={14} />} />
                </SelectTrigger>
                <SelectContent>
                  {uniqueExistingVendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
