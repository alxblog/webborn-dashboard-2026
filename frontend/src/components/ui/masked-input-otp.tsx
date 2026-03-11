import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"

type MaskedInputOTPProps = {
  value: string
  onChange: (value: string) => void
  pattern: string
  disabled?: boolean
  id?: string
}

type PatternPart =
  | { type: "slots"; length: number }
  | { type: "separator"; value: string }

function parsePattern(pattern: string) {
  const parts: PatternPart[] = []
  let starCount = 0
  let separatorBuffer = ""

  for (const char of pattern) {
    if (char === "*") {
      if (separatorBuffer) {
        parts.push({ type: "separator", value: separatorBuffer })
        separatorBuffer = ""
      }

      starCount += 1
      continue
    }

    if (starCount > 0) {
      parts.push({ type: "slots", length: starCount })
      starCount = 0
    }

    separatorBuffer += char
  }

  if (starCount > 0) {
    parts.push({ type: "slots", length: starCount })
  }

  if (separatorBuffer) {
    parts.push({ type: "separator", value: separatorBuffer })
  }

  return parts
}

function getSlotCount(parts: PatternPart[]) {
  return parts.reduce((total, part) => total + (part.type === "slots" ? part.length : 0), 0)
}

export function MaskedInputOTP({
  value,
  onChange,
  pattern,
  disabled,
  id,
}: MaskedInputOTPProps) {
  const parts = parsePattern(pattern)
  const maxLength = getSlotCount(parts)
  let currentIndex = 0

  return (
    <InputOTP
      id={id}
      value={value}
      onChange={onChange}
      maxLength={maxLength}
      disabled={disabled}
      containerClassName="justify-center"
    >
      {parts.map((part, partIndex) => {
        if (part.type === "separator") {
          return (
            <div
              key={`separator-${partIndex}`}
              className="flex items-center px-1 text-sm font-medium text-muted-foreground"
            >
              {part.value === "-" ? <InputOTPSeparator /> : part.value}
            </div>
          )
        }

        const startIndex = currentIndex
        currentIndex += part.length

        return (
          <InputOTPGroup key={`group-${partIndex}`}>
            {Array.from({ length: part.length }, (_, offset) => (
              <InputOTPSlot key={startIndex + offset} index={startIndex + offset} />
            ))}
          </InputOTPGroup>
        )
      })}
    </InputOTP>
  )
}
