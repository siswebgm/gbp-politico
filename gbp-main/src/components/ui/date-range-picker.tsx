import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
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

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
  className?: string
}

export function DateRangePicker({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {
  // Verifica se está no navegador para evitar erros de SSR
  const [isClient, setIsClient] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Verifica o tamanho da tela inicialmente
    checkIfMobile();
    
    // Adiciona um listener para mudanças de tamanho
    window.addEventListener('resize', checkIfMobile);
    
    // Limpa o listener ao desmontar
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  return (
    <div className={cn("w-full", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full sm:w-[300px] justify-start text-left font-normal bg-white hover:bg-gray-50 border-gray-300",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-gray-600" />
            {date?.from ? (
              date.to ? (
                <span className="text-gray-700">
                  {format(date.from, "dd/MM/yyyy")} - {format(date.to, "dd/MM/yyyy")}
                </span>
              ) : (
                <span className="text-gray-700">
                  {format(date.from, "dd/MM/yyyy")}
                </span>
              )
            ) : (
              <span className="text-gray-500">Selecione um período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 bg-white rounded-lg shadow-lg border border-gray-200" 
          align="start"
        >
          <div className="bg-white p-2 rounded-lg">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={onDateChange}
              numberOfMonths={isMobile ? 1 : 2}
              locale={ptBR}
              classNames={{
                day: "h-9 w-9 p-0 font-normal hover:bg-blue-100 rounded-md",
                day_selected: "bg-blue-600 text-white hover:bg-blue-700",
                day_range_start: "bg-blue-600 text-white hover:bg-blue-700",
                day_range_end: "bg-blue-600 text-white hover:bg-blue-700",
                day_today: "border border-blue-200",
                day_outside: "text-gray-400 opacity-50",
                day_disabled: "text-gray-300",
                day_range_middle: "bg-blue-50 text-blue-700",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium text-gray-700",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-gray-100 rounded-md flex items-center justify-center",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-blue-50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
