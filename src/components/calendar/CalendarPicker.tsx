"use client";

import { useState, useMemo } from "react";
import type { AggregatedAvailabilityResponse } from "../../types";

interface CalendarPickerProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  minDate?: Date;
  availableDates?: AggregatedAvailabilityResponse | null;
  isLoadingAvailability?: boolean;
}

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CalendarPicker({
  selectedDate,
  onSelectDate,
  minDate,
  availableDates,
  isLoadingAvailability = false,
}: CalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const hasAvailability = (date: Date): boolean => {
    if (!availableDates) return true;
    const dateKey = formatDateKey(date);
    const slots = availableDates[dateKey];
    return slots && slots.length > 0;
  };

  const minimumDate = useMemo(() => {
    if (minDate) return minDate;
    const min = new Date();
    min.setHours(min.getHours() + 48);
    return min;
  }, [minDate]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(startDate.getDate() - daysToSubtract);

    const days: Date[] = [];
    for (let i = 0; i < 35; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }

    return { days };
  }, [currentMonth]);

  const goToPrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const isDateDisabled = (date: Date) => {
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const minDateOnly = new Date(
      minimumDate.getFullYear(),
      minimumDate.getMonth(),
      minimumDate.getDate()
    );
    return dateOnly < minDateOnly;
  };

  const isDateSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getFullYear() === selectedDate.getFullYear() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getDate() === selectedDate.getDate()
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const canGoPrevMonth = () => {
    const lastDayOfPrevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
    return lastDayOfPrevMonth >= minimumDate;
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goToPrevMonth}
          disabled={!canGoPrevMonth()}
          className="w-6 h-6 flex items-center justify-center text-black disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-0.5">
          <span className="font-semibold text-[15px] leading-6 text-[var(--bf-color-text-primary)]">
            {MONTHS_SHORT[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <button
          type="button"
          onClick={goToNextMonth}
          className="w-6 h-6 flex items-center justify-center text-black"
          aria-label="Next month"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar content */}
      <div className="flex flex-col flex-1">
        {/* Day labels */}
        <div className="flex">
          {DAYS_OF_WEEK.map((day, index) => (
            <div key={index} className="flex-1 flex items-center justify-center h-6 font-semibold text-[11px] leading-[14px] text-[var(--bf-color-text-subtle)] text-center">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex flex-col flex-1 relative gap-1">
          {isLoadingAvailability && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-md">
              <div className="flex items-center gap-1.5 text-gray-500">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs">Loading...</span>
              </div>
            </div>
          )}

          {[0, 1, 2, 3, 4].map((rowIndex) => (
            <div key={rowIndex} className="flex flex-1 gap-1">
              {calendarDays.days.slice(rowIndex * 7, rowIndex * 7 + 7).map((date, dayIndex) => {
                const disabled = isDateDisabled(date);
                const selected = isDateSelected(date);
                const today = isToday(date);
                const currentMo = isCurrentMonth(date);
                const hasSlots = availableDates ? hasAvailability(date) : false;
                const isAfterMin = date >= minimumDate;

                let textColorClass = `text-[var(--bf-color-text-calendar)]`;
                if (!currentMo) {
                  textColorClass = "text-[var(--bf-color-text-disabled)]";
                } else if (disabled) {
                  textColorClass = "text-[var(--bf-color-text-disabled)]";
                } else if (hasSlots && isAfterMin) {
                  textColorClass = "text-[var(--bf-color-text-primary)] font-semibold";
                }

                return (
                  <div
                    key={dayIndex}
                    className="flex-1 flex flex-col items-center justify-center h-8"
                  >
                    <button
                      type="button"
                      onClick={() => !disabled && onSelectDate(date)}
                      disabled={disabled}
                      className={`
                        relative flex items-center justify-center rounded-md w-full h-full
                        text-[15px] leading-6 transition-all duration-100 ease-out
                        motion-reduce:transition-none motion-reduce:active:scale-100
                        ${selected
                          ? "bg-[var(--bf-color-text-primary)] text-white font-semibold"
                          : textColorClass
                        }
                        ${!disabled && !selected ? "cursor-pointer hover:bg-gray-100 active:scale-[0.97]" : ""}
                        ${disabled ? "cursor-not-allowed" : ""}
                        ${hasSlots && isAfterMin && currentMo && !selected ? "bg-[var(--bf-color-accent-bg)]" : ""}
                      `}
                      aria-label={date.toDateString()}
                      aria-selected={selected}
                    >
                      {date.getDate()}
                      {today && !selected && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-black rounded-full" />
                      )}
                      {hasSlots && isAfterMin && currentMo && !selected && !today && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[var(--bf-color-accent)] rounded-full" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      {availableDates && Object.keys(availableDates || {}).length > 0 && (
        <div className="flex items-center gap-4 text-[11px] text-[var(--bf-color-text-subtle)]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[var(--bf-color-accent)] rounded-full" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-black rounded-full" />
            <span>Today</span>
          </div>
        </div>
      )}
    </div>
  );
}
