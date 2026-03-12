"use client"

import * as React from "react"
import { format } from "date-fns"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type DateTimePickerProps = {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
}

function parseLocalDateTime(value?: string) {
  if (!value) {
    return { date: undefined, time: "" }
  }

  const [datePart = "", timePart = ""] = value.split("T")
  if (!datePart) {
    return { date: undefined, time: "" }
  }

  const [year, month, day] = datePart.split("-").map(Number)
  if (!year || !month || !day) {
    return { date: undefined, time: "" }
  }

  const normalizedTime = timePart.slice(0, 5)
  const [hours = 0, minutes = 0] = normalizedTime.split(":").map(Number)
  const date = new Date(year, month - 1, day, hours, minutes)

  return {
    date: Number.isNaN(date.getTime()) ? undefined : date,
    time: normalizedTime,
  }
}

function formatDatePart(date?: Date) {
  if (!date) {
    return ""
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function mergeDateAndTime(date?: Date, time = "00:00") {
  if (!date) {
    return ""
  }

  const normalizedTime = time || "00:00"
  return `${formatDatePart(date)}T${normalizedTime}`
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Choisir une date",
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const { date, time } = React.useMemo(() => parseLocalDateTime(value), [value])

  return (
    <div className={cn("flex w-full gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            data-empty={!date}
            className="flex-1 justify-between font-normal data-[empty=true]:text-muted-foreground"
          >
            {date ? format(date, "PPP") : placeholder}
            <ChevronDownIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            captionLayout="dropdown"
            defaultMonth={date}
            onSelect={(nextDate) => {
              onChange?.(mergeDateAndTime(nextDate, time))
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>

      <Input
        type="time"
        step="60"
        value={time}
        onChange={(event) => onChange?.(mergeDateAndTime(date, event.target.value))}
        className="w-32 appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
      />
    </div>
  )
}
