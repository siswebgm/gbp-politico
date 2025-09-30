import * as React from "react"
import { Clock } from "lucide-react"
import { Label } from "./label"
import { Input } from "./input"

interface TimePickerProps {
  value: Date
  onChange: (date: Date) => void
  disabled?: boolean
}

export function TimePicker({ value, onChange, disabled }: TimePickerProps) {
  const timeRef = React.useRef<HTMLInputElement>(null)

  const [timeValue, setTimeValue] = React.useState(
    value ? value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''
  )

  React.useEffect(() => {
    if (value) {
      setTimeValue(value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    }
  }, [value])

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeValue(e.target.value)

    const [hours, minutes] = e.target.value.split(':').map(Number)
    if (!isNaN(hours) && !isNaN(minutes)) {
      const newDate = new Date(value)
      newDate.setHours(hours)
      newDate.setMinutes(minutes)
      onChange(newDate)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Input
            ref={timeRef}
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            disabled={disabled}
            className="w-[120px]"
          />
          <Clock className="h-4 w-4 opacity-50" />
        </div>
      </div>
    </div>
  )
}

TimePicker.displayName = "TimePicker"
