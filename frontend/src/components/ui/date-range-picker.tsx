"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn, formatDateOnly } from "@/lib/utils"
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
  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    if (value) return value;
    const today = new Date();
    const m = today.getMonth();
    const fyStartYear = m < 3 ? today.getFullYear() - 1 : today.getFullYear();
    return {
      from: new Date(fyStartYear, 3, 1),
      to: new Date(fyStartYear + 1, 2, 31)
    };
  });

  const [startMonth, setStartMonth] = React.useState<number>(3); // Apr
  const [startYear, setStartYear] = React.useState<number>(2026);
  const [endMonth, setEndMonth] = React.useState<number>(2);   // Mar
  const [endYear, setEndYear] = React.useState<number>(2027);

  // Sync internal dropdown states when date range changes
  React.useEffect(() => {
    if (date?.from) {
      setStartMonth(date.from.getMonth());
      setStartYear(date.from.getFullYear());
    }
    if (date?.to) {
      setEndMonth(date.to.getMonth());
      setEndYear(date.to.getFullYear());
    }
  }, [date]);

  // Keep internal state in sync with external value prop if changed
  const lastExternalValue = React.useRef<string>("");
  React.useEffect(() => {
    if (!value) return;
    const valKey = `${value.from ? formatDateOnly(value.from) : ''}_${value.to ? formatDateOnly(value.to) : ''}`;
    if (valKey !== lastExternalValue.current) {
      lastExternalValue.current = valKey;
      setDate(value);
    }
  }, [value]);

  // Store onDateChange in a ref so changes in inline function identity do not trigger useEffect
  const onDateChangeRef = React.useRef(onDateChange);
  React.useEffect(() => {
    onDateChangeRef.current = onDateChange;
  }, [onDateChange]);

  // Notify parent only when date range value actually changes
  const initialKey = date?.from ? `${formatDateOnly(date.from)}_${date.to ? formatDateOnly(date.to) : formatDateOnly(date.from)}` : "";
  const lastNotifiedValue = React.useRef<string>(initialKey);

  React.useEffect(() => {
    if (!date?.from) return;
    const currentKey = `${formatDateOnly(date.from)}_${date.to ? formatDateOnly(date.to) : formatDateOnly(date.from)}`;
    if (lastNotifiedValue.current !== currentKey) {
      lastNotifiedValue.current = currentKey;
      if (onDateChangeRef.current) {
        onDateChangeRef.current(date);
      }
    }
  }, [date]);

  const applyMonthYearRange = (sMonth: number, sYear: number, eMonth: number, eYear: number) => {
    const from = new Date(sYear, sMonth, 1);
    const to = new Date(eYear, eMonth + 1, 0); // last day of end month
    setDate({ from, to });
  };

  const monthsList = [
    { name: "Jan", idx: 0 }, { name: "Feb", idx: 1 }, { name: "Mar", idx: 2 },
    { name: "Apr", idx: 3 }, { name: "May", idx: 4 }, { name: "Jun", idx: 5 },
    { name: "Jul", idx: 6 }, { name: "Aug", idx: 7 }, { name: "Sep", idx: 8 },
    { name: "Oct", idx: 9 }, { name: "Nov", idx: 10 }, { name: "Dec", idx: 11 }
  ];

  const yearsList = [2027, 2026, 2025, 2024];

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger
          id="date"
          className={cn(
            "flex w-[260px] items-center justify-start gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-normal shadow-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="truncate">
            {date?.from ? (
              date.to ? (
                <>{format(date.from, "LLL dd, y")} – {format(date.to, "LLL dd, y")}</>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              "Pick a date range"
            )}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border border-slate-200 shadow-xl rounded-xl" align="end">
          {/* Quick Presets & Custom Range Selector */}
          <div className="flex flex-col gap-3 p-4 w-[260px] bg-white rounded-xl">
             <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">QUICK MONTH PRESETS</span>
             <div className="grid grid-cols-2 gap-1.5">
               <Button
                 variant="outline"
                 size="sm"
                 className="text-[11px] h-7 px-2 justify-start font-medium"
                 onClick={() => setDate({
                   from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                   to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
                 })}
               >
                 This Month
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 className="text-[11px] h-7 px-2 justify-start font-medium"
                 onClick={() => setDate({
                   from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                   to: new Date(new Date().getFullYear(), new Date().getMonth(), 0)
                 })}
               >
                 Last Month
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 className="text-[11px] h-7 px-2 justify-start font-medium"
                 onClick={() => setDate({
                   from: new Date(2026, 3, 1),
                   to: new Date(2027, 2, 31)
                 })}
               >
                 FY 2026-27
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 className="text-[11px] h-7 px-2 justify-start font-medium"
                 onClick={() => setDate({
                   from: new Date(2025, 3, 1),
                   to: new Date(2026, 2, 31)
                 })}
               >
                 FY 2025-26
               </Button>
             </div>

             <div className="border-t border-slate-100 my-1"></div>

             <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">CUSTOM PERIOD (START → END)</span>
             
             {/* START PERIOD */}
             <div>
               <label className="text-[11px] font-semibold text-slate-500 block mb-1">START (Month, Year)</label>
               <div className="flex gap-2">
                 <select
                   value={startMonth}
                   onChange={(e) => setStartMonth(Number(e.target.value))}
                   className="flex-1 text-xs border border-slate-300 rounded-md px-2 py-1.5 bg-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                 >
                   {monthsList.map(m => <option key={m.idx} value={m.idx}>{m.name}</option>)}
                 </select>
                 <select
                   value={startYear}
                   onChange={(e) => setStartYear(Number(e.target.value))}
                   className="w-20 text-xs border border-slate-300 rounded-md px-2 py-1.5 bg-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                 >
                   {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                 </select>
               </div>
             </div>

             {/* END PERIOD */}
             <div>
               <label className="text-[11px] font-semibold text-slate-500 block mb-1">END (Month, Year)</label>
               <div className="flex gap-2">
                 <select
                   value={endMonth}
                   onChange={(e) => setEndMonth(Number(e.target.value))}
                   className="flex-1 text-xs border border-slate-300 rounded-md px-2 py-1.5 bg-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                 >
                   {monthsList.map(m => <option key={m.idx} value={m.idx}>{m.name}</option>)}
                 </select>
                 <select
                   value={endYear}
                   onChange={(e) => setEndYear(Number(e.target.value))}
                   className="w-20 text-xs border border-slate-300 rounded-md px-2 py-1.5 bg-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                 >
                   {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                 </select>
               </div>
             </div>

             <Button
               className="w-full text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all mt-1"
               onClick={() => applyMonthYearRange(startMonth, startYear, endMonth, endYear)}
             >
               Apply Date Range
             </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
