"use client";

import Select from "../ui/Select";
import type { TimezoneData, TimeSlot } from "../../types";

interface TimeSlotPickerProps {
  selectedTime: string | null;
  onSelectTime: (time: string, value: string) => void;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  timezones: TimezoneData[];
  timeSlots: TimeSlot[];
  isLoadingTimezones: boolean;
  showOnlyTimezone?: boolean;
  overlayMode?: boolean;
}

export default function TimeSlotPicker({
  selectedTime,
  onSelectTime,
  timezone,
  onTimezoneChange,
  timezones,
  timeSlots,
  isLoadingTimezones,
  showOnlyTimezone = false,
  overlayMode = false,
}: TimeSlotPickerProps) {
  const timezoneOptions = timezones.map((tz) => ({
    value: tz.name,
    label: tz.display,
  }));

  if (isLoadingTimezones) {
    timezoneOptions.unshift({
      value: timezone,
      label: "Loading timezones...",
    });
  }

  if (showOnlyTimezone) {
    return (
      <div className="w-full">
        <Select
          label="Timezone"
          value={timezone}
          onChange={(e) => onTimezoneChange(e.target.value)}
          options={timezoneOptions}
          disabled={isLoadingTimezones}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {!overlayMode && (
        <p className="text-sm text-[var(--bf-color-text)] tracking-[0.14px]">
          Select your slot
        </p>
      )}

      {isLoadingTimezones ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-gray-500">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm">Loading available times...</span>
          </div>
        </div>
      ) : timeSlots.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {timeSlots.map((slot) => {
            const isSelected = selectedTime === slot.time;

            return (
              <button
                key={slot.time}
                type="button"
                onClick={() => onSelectTime(slot.time, slot.value)}
                className={`
                  px-[12px] py-[10px] text-[14px] font-medium tracking-[0.14px] rounded-[8px]
                  border transition-[transform,border-color,background-color] duration-100 ease-out
                  opacity-0 bf-animate-slot-enter
                  active:scale-[0.97]
                  motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:opacity-100 motion-reduce:animate-none
                  ${isSelected
                    ? "bg-[var(--bf-color-accent)] text-black border-black"
                    : "bg-[var(--bf-color-bg)] text-black border-[var(--bf-color-border-idle)] hover:border-[var(--bf-color-accent)]"
                  }
                `}
              >
                {slot.time}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="py-6 text-center">
          <p className="text-sm text-gray-500">
            No available times for this date
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Please select another date from the calendar
          </p>
        </div>
      )}
    </div>
  );
}
