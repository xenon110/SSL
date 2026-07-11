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
  onDateChange
}: {
  className?: string;
  onDateChange?: (date: DateRange | undefined) => void;
}) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: new Date()
  })

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
            <div className="flex flex-col gap-1 border-r p-3 w-[140px] bg-muted/20">
               <span className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Presets</span>
               <Button variant="ghost" className="justify-start text-xs h-8" onClick={() => setDate({from: new Date(), to: new Date()})}>Today (Daily)</Button>
               <Button variant="ghost" className="justify-start text-xs h-8" onClick={() => setDate({from: addDays(new Date(), -7), to: new Date()})}>Last 7 Days</Button>
               <Button variant="ghost" className="justify-start text-xs h-8" onClick={() => { const d = new Date(); d.setDate(1); setDate({from: d, to: new Date()})}}>This Month</Button>
               <Button variant="ghost" className="justify-start text-xs h-8" onClick={() => { 
                 const d = new Date(); 
                 const qMonth = Math.floor(d.getMonth() / 3) * 3;
                 d.setMonth(qMonth, 1);
                 setDate({from: d, to: new Date()});
               }}>This Quarter</Button>
               <Button variant="ghost" className="justify-start text-xs h-8" onClick={() => setDate({from: new Date(new Date().getFullYear(), 0, 1), to: new Date()})}>This Year</Button>
               <Button variant="ghost" className="justify-start text-xs h-8" onClick={() => setDate({from: new Date(2000, 0, 1), to: new Date()})}>All Time</Button>
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
