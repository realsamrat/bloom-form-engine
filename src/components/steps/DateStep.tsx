"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import CalendarPicker from "../calendar/CalendarPicker";
import TimeSlotPicker from "../calendar/TimeSlotPicker";
import type { StepConfig, BloomFormData, TimezoneData, TimeSlot, AggregatedAvailabilityResponse } from "../../types";
import { BloomApiClient, getTimeSlotsFromAggregated } from "../../core/BloomApiClient";

interface DateStepProps {
  stepConfig: StepConfig;
  formData: BloomFormData;
  onUpdate: (data: Partial<BloomFormData>) => void;
  onOverlayChange?: (isOpen: boolean) => void;
  apiClient: BloomApiClient;
  cachedTimezones?: TimezoneData[];
  cachedAvailability?: AggregatedAvailabilityResponse | null;
  onCacheUpdate?: (data: { timezones?: TimezoneData[]; availability?: AggregatedAvailabilityResponse }) => void;
}

function parseISODate(isoString: string): { date: Date | null; time: string | null } {
  if (!isoString) return { date: null, time: null };

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return { date: null, time: null };

    const hours = date.getHours();
    const minutes = date.getMinutes();
    const h = hours % 12 || 12;
    const m = minutes.toString().padStart(2, "0");
    const ampm = hours < 12 ? "am" : "pm";
    return {
      date,
      time: `${h.toString().padStart(2, "0")}:${m}${ampm}`,
    };
  } catch {
    return { date: null, time: null };
  }
}

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
}

// Returns today's date string (YYYY-MM-DD) in the given IANA timezone,
// so the availability range sent to Bloom is always anchored to the user's
// local calendar date — not the server/browser's UTC date.
function getTodayStringInTimezone(tz: string): string {
  try {
    // en-CA formats as YYYY-MM-DD natively
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  } catch {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
}

// Computes DST-aware offset/abbreviation for a timezone at the current moment.
// Replaces the old hardcoded PST/CST/etc. offsets that were wrong during DST.
function computeFallbackTimezone(name: string): TimezoneData {
  try {
    const now = new Date();
    // toLocaleString gives wall-clock time in that zone; diff vs UTC = offset
    const localMs = new Date(now.toLocaleString("en-US", { timeZone: name })).getTime();
    const utcMs = new Date(now.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
    const offsetMinutes = Math.round((localMs - utcMs) / 60000);
    const absH = Math.floor(Math.abs(offsetMinutes) / 60);
    const absM = Math.abs(offsetMinutes) % 60;
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const offsetFormatted = `${sign}${String(absH).padStart(2, "0")}:${String(absM).padStart(2, "0")}`;
    const abbr =
      new Intl.DateTimeFormat("en-US", { timeZone: name, timeZoneName: "short" })
        .formatToParts(now)
        .find((p) => p.type === "timeZoneName")?.value ?? "";
    return {
      name,
      offset: offsetMinutes,
      offsetFormatted,
      abbreviation: abbr,
      display: `${name} (${offsetFormatted} ${abbr})`.trim(),
    };
  } catch {
    return { name, offset: 0, offsetFormatted: "+00:00", abbreviation: "", display: name };
  }
}

export default function DateStep({
  stepConfig,
  formData,
  onUpdate,
  onOverlayChange,
  apiClient,
  cachedTimezones,
  cachedAvailability,
  onCacheUpdate,
}: DateStepProps) {
  const timezoneKey = `${stepConfig.id}_timezone`;
  const valueKey = `${stepConfig.id}_value`;

  const timezone = (formData[timezoneKey] as string) || "";
  const eventDate = (formData[valueKey] as string) || "";

  const [timezones, setTimezones] = useState<TimezoneData[]>(cachedTimezones || []);
  const [aggregatedAvailability, setAggregatedAvailability] = useState<AggregatedAvailabilityResponse | null>(cachedAvailability || null);
  const [isLoadingTimezones, setIsLoadingTimezones] = useState(!cachedTimezones || cachedTimezones.length === 0);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isTimezoneReady, setIsTimezoneReady] = useState(Boolean(cachedTimezones && cachedTimezones.length > 0));
  const [showSlotOverlay, setShowSlotOverlay] = useState(false);
  const [showBlur, setShowBlur] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { date: parsedDate, time: parsedTime } = useMemo(
    () => parseISODate(eventDate),
    [eventDate]
  );

  const [selectedDate, setSelectedDate] = useState<Date | null>(parsedDate);
  const [selectedTime, setSelectedTime] = useState<string | null>(parsedTime);
  const [selectedTimeValue, setSelectedTimeValue] = useState<string | null>(eventDate || null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setShowSlotOverlay(false);
    setShowBlur(false);
    onOverlayChange?.(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (eventDate) {
      const { date, time } = parseISODate(eventDate);
      setSelectedDate(date);
      setSelectedTime(time);
      setSelectedTimeValue(eventDate);
    }
  }, [eventDate]);

  useEffect(() => {
    if (showSlotOverlay) {
      setShowBlur(true);
    } else {
      const timer = setTimeout(() => setShowBlur(false), 120);
      return () => clearTimeout(timer);
    }
  }, [showSlotOverlay]);

  useEffect(() => {
    if (!showSlotOverlay) return;

    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowSlotOverlay(false);
        onOverlayChange?.(false);
      }
    }

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [showSlotOverlay, onOverlayChange]);

  useEffect(() => {
    if (cachedTimezones && cachedTimezones.length > 0) {
      return;
    }

    let mounted = true;

    async function loadTimezones() {
      try {
        const tzData = await apiClient.fetchTimezones();
        if (!mounted) return;

        setTimezones(tzData);
        setIsLoadingTimezones(false);
        onCacheUpdate?.({ timezones: tzData });

        const browserTimezone = getBrowserTimezone();
        let matchedTz = tzData.find(tz => tz.name === browserTimezone);

        if (!matchedTz) {
          const browserRegion = browserTimezone.split("/")[0];
          matchedTz = tzData.find(tz => tz.name.startsWith(browserRegion + "/"));
        }

        if (!matchedTz) {
          matchedTz = tzData.find(tz => tz.name === "America/New_York");
        }

        if (matchedTz && !timezone) {
          onUpdate({ [timezoneKey]: matchedTz.name });
        }

        setIsTimezoneReady(true);
      } catch {
        if (!mounted) return;

        setIsLoadingTimezones(false);
        // Computed at runtime so DST offsets (PDT vs PST, EDT vs EST, etc.) are always correct.
        // Covers all US time zones including Hawaii (no DST) and Alaska.
        const defaultTimezones: TimezoneData[] = [
          computeFallbackTimezone("America/New_York"),
          computeFallbackTimezone("America/Chicago"),
          computeFallbackTimezone("America/Denver"),
          computeFallbackTimezone("America/Los_Angeles"),
          computeFallbackTimezone("America/Anchorage"),
          computeFallbackTimezone("Pacific/Honolulu"),
        ];
        setTimezones(defaultTimezones);
        onCacheUpdate?.({ timezones: defaultTimezones });

        if (!timezone) {
          onUpdate({ [timezoneKey]: "America/New_York" });
        }
        setIsTimezoneReady(true);
      }
    }

    loadTimezones();

    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isTimezoneReady || !timezone || timezones.length === 0) {
      return;
    }

    if (cachedAvailability && Object.keys(cachedAvailability).length > 0) {
      return;
    }

    const validTimezone = timezones.find(tz => tz.name === timezone);
    if (!validTimezone) {
      return;
    }

    let mounted = true;

    async function loadAvailability() {
      setIsLoadingAvailability(true);

      // Anchor the date range to today in the user's selected timezone.
      const todayStr = getTodayStringInTimezone(timezone);
      const [yr, mo, dy] = todayStr.split("-").map(Number);

      // Bloom's API rejects large date ranges, so we fetch in 6-month batches
      // and merge the results. 4 batches × 6 months = 24 months total, all
      // fired in parallel so there's no extra wait time for the user.
      const BATCH_MONTHS = 6;
      const TOTAL_MONTHS = 24;
      const numBatches = Math.ceil(TOTAL_MONTHS / BATCH_MONTHS);

      try {
        const results = await Promise.all(
          Array.from({ length: numBatches }, (_, i) => {
            const bStart = new Date(yr, mo - 1 + i * BATCH_MONTHS, dy);
            const bEnd = new Date(yr, mo - 1 + (i + 1) * BATCH_MONTHS, dy);
            bEnd.setDate(bEnd.getDate() + 1); // inclusive end
            return apiClient
              .fetchAvailability(timezone, bStart, bEnd, stepConfig.id)
              .catch(() => ({} as AggregatedAvailabilityResponse)); // one batch failing won't kill the rest
          })
        );

        if (!mounted) return;

        const merged: AggregatedAvailabilityResponse = Object.assign({}, ...results);
        const hasData = Object.keys(merged).length > 0;
        setAggregatedAvailability(hasData ? merged : null);
        setIsLoadingAvailability(false);
        onCacheUpdate?.({ availability: merged });
      } catch {
        if (!mounted) return;

        setAggregatedAvailability(null);
        setIsLoadingAvailability(false);
      }
    }

    loadAvailability();

    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone, isTimezoneReady, timezones, apiClient, stepConfig.id]);

  const timeSlots = useMemo<TimeSlot[]>(() => {
    if (!selectedDate || !aggregatedAvailability) {
      return [];
    }
    return getTimeSlotsFromAggregated(aggregatedAvailability, selectedDate);
  }, [selectedDate, aggregatedAvailability]);

  useEffect(() => {
    if (selectedTimeValue) {
      onUpdate({ [valueKey]: selectedTimeValue });
    }
  }, [selectedTimeValue, onUpdate, valueKey]);

  const handleDateSelect = useCallback((date: Date) => {
    const isSameDate = selectedDate &&
      date.getFullYear() === selectedDate.getFullYear() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getDate() === selectedDate.getDate();

    if (isSameDate) {
      setShowSlotOverlay(true);
      onOverlayChange?.(true);
    } else {
      setSelectedDate(date);
      setSelectedTime(null);
      setSelectedTimeValue(null);
      onUpdate({ [valueKey]: "" });
      setShowSlotOverlay(true);
      onOverlayChange?.(true);
    }
  }, [onOverlayChange, onUpdate, valueKey, selectedDate]);

  const handleCloseOverlay = useCallback(() => {
    setShowSlotOverlay(false);
    onOverlayChange?.(false);
    setIsAtBottom(false);
  }, [onOverlayChange]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 10;
    setIsAtBottom(isBottom);
  }, []);

  const handleTimeSelect = useCallback((time: string, value: string) => {
    setSelectedTime(time);
    setSelectedTimeValue(value);
  }, []);

  const handleTimezoneChange = useCallback((tz: string) => {
    onUpdate({ [timezoneKey]: tz });
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedTimeValue(null);
    setAggregatedAvailability(null);
    onCacheUpdate?.({ availability: undefined as unknown as AggregatedAvailabilityResponse });
  }, [onUpdate, timezoneKey, onCacheUpdate]);

  const minDate = useMemo(() => {
    const min = new Date();
    min.setHours(min.getHours() + 48);
    return min;
  }, []);

  return (
    <div className="relative">
      <div className={`transition-[filter] duration-100 ease-[cubic-bezier(0.22,1,0.36,1)] ${showBlur ? "blur-[3px] pointer-events-none" : ""}`}>
        <CalendarPicker
          selectedDate={selectedDate}
          onSelectDate={handleDateSelect}
          minDate={minDate}
          availableDates={aggregatedAvailability}
          isLoadingAvailability={isLoadingAvailability || !isTimezoneReady}
        />

        <div className="mt-6">
          <TimeSlotPicker
            selectedTime={null}
            onSelectTime={() => {}}
            timezone={timezone}
            onTimezoneChange={handleTimezoneChange}
            timezones={timezones}
            timeSlots={[]}
            isLoadingTimezones={isLoadingTimezones}
            showOnlyTimezone
          />
        </div>
      </div>

      <AnimatePresence>
        {showSlotOverlay && selectedDate && (
          <motion.div
            transition={shouldReduceMotion ? { duration: 0 } : {
              type: "spring",
              bounce: 0.2,
            }}
            initial={shouldReduceMotion ? undefined : {
              opacity: 0,
              y: 8,
              scale: 0.95,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: shouldReduceMotion ? { duration: 0 } : {
                delay: 0.05,
              },
            }}
            exit={shouldReduceMotion ? undefined : {
              opacity: 0,
              y: 4,
              scale: 0.98,
              transition: { duration: 0.1, ease: [0.22, 1, 0.36, 1] }
            }}
            className="absolute inset-0 bg-[var(--bf-color-bg)] border border-[var(--bf-color-border)] rounded-[var(--bf-radius)] z-30 origin-bottom flex flex-col overflow-hidden"
          >
            <div className="flex-shrink-0 flex items-center justify-between px-4 pt-3 pb-2">
              <p className="text-sm text-[var(--bf-color-text)] tracking-[0.14px] font-medium">
                Select your slot
              </p>
              <button
                type="button"
                onClick={handleCloseOverlay}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close time slot picker"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="relative flex-1 min-h-0">
              <div className="absolute top-0 left-0 right-3 h-6 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />

              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="overflow-y-auto h-full px-4 pt-3 pb-12"
              >
                <TimeSlotPicker
                  selectedTime={selectedTime}
                  onSelectTime={handleTimeSelect}
                  timezone={timezone}
                  onTimezoneChange={handleTimezoneChange}
                  timezones={timezones}
                  timeSlots={timeSlots}
                  isLoadingTimezones={isLoadingTimezones || isLoadingAvailability}
                  overlayMode
                />
              </div>

              <div className="absolute bottom-0 left-0 right-3 h-16 bg-gradient-to-t from-white from-25% via-white/75 via-60% to-transparent z-10 pointer-events-none" />

              {!isAtBottom && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
