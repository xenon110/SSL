"use client"

import * as React from "react"
import { addDays, format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DateRangePicker({
  className,
  value,
  onDateChange
}: {
  className?: string;
  value?: DateRange;
  onDateChange?: (date: DateRange | undefined) => void;
}) {
  const [date, setDate] = React.useState<DateRange | undefined>(value || {
    from: new Date(new Date().getFullYear(), 0, 1),
    to: new Date()
  })

  // Keep internal state in sync with external value prop
  React.useEffect(() => {
    if (value) {
      setDate(value);
    }
  }, [value])

  // Whenever internal date changes, notify parent
  React.useEffect(() => {
    if (onDateChange) {
      onDateChange(date)
    }
  }, [date])

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-[260px] justify-start text-left font-normal border shadow-sm",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} -{" "}
                    {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex border-b">
            <div className="flex flex-col gap-1 border-r p-3 w-[175px] bg-muted/20">
               <span className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Presets</span>
               <Button variant="ghost" className="justify-start text-xs h-8 px-2" onClick={() => {
                 const d = new Date();
                 setDate({ from: d, to: d });
               }}>Today</Button>
               <Button variant="ghost" className="justify-start text-xs h-8 px-2" onClick={() => {
                 const d = new Date();
                 d.setDate(d.getDate() - 1);
                 setDate({ from: d, to: d });
               }}>Yesterday</Button>
               <Button variant="ghost" className="justify-start text-xs h-8 px-2" onClick={() => {
                 const d = new Date();
                 d.setDate(d.getDate() - 6);
                 setDate({ from: d, to: new Date() });
               }}>Last 7 Days</Button>
               <Button variant="ghost" className="justify-start text-xs h-8 px-2" onClick={() => {
                 const d = new Date();
                 d.setDate(d.getDate() - 29);
                 setDate({ from: d, to: new Date() });
               }}>Last 30 Days</Button>
               <Button variant="ghost" className="justify-start text-xs h-8 px-2" onClick={() => {
                 const d = new Date();
                 d.setDate(1);
                 setDate({ from: d, to: new Date() });
               }}>This Month</Button>
               <Button variant="ghost" className="justify-start text-xs h-8 px-2" onClick={() => {
                 const f = new Date();
                 f.setMonth(f.getMonth() - 1);
                 f.setDate(1);
                 const t = new Date();
                 t.setDate(0);
                 setDate({ from: f, to: t });
               }}>Last Month</Button>
               <Button variant="ghost" className="justify-start text-xs h-8 px-2" onClick={() => {
                 const d = new Date();
                 const m = d.getMonth();
                 let qStart = 0; let qEnd = 0;
                 if (m >= 3 && m <= 5) { qStart = 3; qEnd = 5; }
                 else if (m >= 6 && m <= 8) { qStart = 6; qEnd = 8; }
                 else if (m >= 9 && m <= 11) { qStart = 9; qEnd = 11; }
                 else { qStart = 0; qEnd = 2; }
                 setDate({ from: new Date(d.getFullYear(), qStart, 1), to: new Date(d.getFullYear(), qEnd + 1, 0) });
               }}>Financial Quarter</Button>
               <Button variant="ghost" className="justify-start text-xs h-8 px-2 animate-pulse text-blue-600 font-medium" onClick={() => {
                 const d = new Date();
                 const m = d.getMonth();
                 const fyStart = m < 3 ? d.getFullYear() - 1 : d.getFullYear();
                 setDate({ from: new Date(fyStart, 3, 1), to: new Date(fyStart + 1, 2, 31) });
               }}>Financial Year</Button>
               <Button variant="ghost" className="justify-start text-xs h-8 px-2" onClick={() => {
                 const d = new Date();
                 const m = d.getMonth();
                 const fyStart = (m < 3 ? d.getFullYear() - 1 : d.getFullYear()) - 1;
                 setDate({ from: new Date(fyStart, 3, 1), to: new Date(fyStart + 1, 2, 31) });
               }}>Prev Financial Year</Button>
            </div>
            <Calendar
              autoFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
