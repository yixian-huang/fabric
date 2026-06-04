
import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Cell } from "./GridTypes";

interface DateCellContentProps {
  cell: Cell;
  onUpdate: (date: string) => void;
}

export const DateCellContent: React.FC<DateCellContentProps> = ({
  cell,
  onUpdate,
}) => {
  const date = React.useMemo(() => {
    if (!cell.content) return undefined;
    if (cell.content instanceof Date) return cell.content;
    if (typeof cell.content === "string") {
      try {
        return new Date(cell.content);
      } catch (e) {
        return undefined;
      }
    }
    return undefined;
  }, [cell.content]);

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      onUpdate(newDate.toISOString());
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          {date ? format(date, "yyyy-MM-dd") : <span>选择日期</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
};
