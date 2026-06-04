
import React from "react";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ 
  color, 
  onChange, 
  label = "选择颜色" 
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="h-8 w-8 p-0 flex items-center justify-center color-picker-button"
          style={{ backgroundColor: color }}
        >
          <span className="sr-only">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 color-picker-popover">
        <div className="space-y-2 color-picker-content">
          <HexColorPicker color={color} onChange={onChange} className="react-colorful" />
          <div className="flex items-center justify-between color-picker-label">
            <div className="color-picker-text">{label}</div>
            <div className="font-mono text-sm color-picker-value">{color}</div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
