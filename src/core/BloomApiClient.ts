// BloomApiClient - Configurable API client for Bloom forms

import type {
  BloomFormConfig,
  TimezoneData,
  AggregatedAvailabilityResponse,
  AggregatedSlot,
  TimeSlot,
  DatePayload,
} from '../types';

const BLOOM_BASE_URL = "https://api.bloom.io/api";

// Raw API response types
interface BloomDailySchedule {
  date: string;
  schedule: Array<{ start: string; end: string }>;
}

interface BloomAggregatedResponse {
  dailySchedules?: BloomDailySchedule[];
  [key: string]: unknown;
}

export class BloomApiClient {
  private accountId: string;
  private formId: string;
  private questionIds: Map<string, string>;

  constructor(config: BloomFormConfig) {
    this.accountId = config.accountId;
    this.formId = config.formId;
    this.questionIds = new Map(
      config.steps
        .filter(step => step.questionId)
        .map(step => [step.id, step.questionId])
    );
  }

  private getHeaders(): HeadersInit {
    return {
      Accept: "application/vnd.bloom.v3",
      "x-account": this.accountId,
      "Content-Type": "application/json",
    };
  }

  // Create a new answer group (called on form mount)
  async createAnswerGroup(): Promise<string> {
    const response = await fetch(
      `${BLOOM_BASE_URL}/questionnaires/${this.formId}/answer-groups`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create answer group: ${response.status}`);
    }

    const data = await response.json();
    return data["answer-group"]?.id || data.id;
  }

  // Submit an answer for a specific step
  async submitAnswer(
    answerGroupId: string,
    stepId: string,
    payload: DatePayload | Record<string, string> | string | string[]
  ): Promise<void> {
    const questionId = this.questionIds.get(stepId);
    if (!questionId) {
      console.warn(`[BloomApiClient] No questionId for step: ${stepId}`);
      return;
    }

    const response = await fetch(
      `${BLOOM_BASE_URL}/questionnaires/${this.formId}/answers`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          answerGroupId,
          questionId,
          payload,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.clientMessages?.[0]?.messages?.[0] || errorData.message || `Failed to submit answer: ${response.status}`;
      throw new Error(errorMessage);
    }
  }

  // Finalize the form submission
  async finalizeSubmission(answerGroupId: string): Promise<void> {
    const response = await fetch(
      `${BLOOM_BASE_URL}/questionnaires/${this.formId}/answers`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          answerGroupId: answerGroupId,
          payload: "SUBMIT",
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.clientMessages?.[0]?.messages?.[0] || errorData.message || `Failed to finalize: ${response.status}`;
      throw new Error(errorMessage);
    }
  }

  // Fetch available timezones
  async fetchTimezones(): Promise<TimezoneData[]> {
    const response = await fetch(`${BLOOM_BASE_URL}/timezones`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch timezones: ${response.status}`);
    }

    const data = await response.json();
    const timezones = data.timezones || data;

    return timezones.map((tz: { id?: string; name: string; offset: number | string; abbreviation: string; offsetFormatted?: string }) => {
      let offsetMinutes: number;
      let offsetStr: string;

      if (typeof tz.offset === "string") {
        offsetStr = tz.offset;
        const match = tz.offset.match(/([+-]?)(\d{2}):(\d{2})/);
        if (match) {
          const sign = match[1] === "-" ? -1 : 1;
          const hours = parseInt(match[2], 10);
          const mins = parseInt(match[3], 10);
          offsetMinutes = sign * (hours * 60 + mins);
        } else {
          offsetMinutes = 0;
          offsetStr = "+00:00";
        }
      } else if (typeof tz.offset === "number" && !isNaN(tz.offset)) {
        offsetMinutes = tz.offset;
        offsetStr = this.formatOffset(tz.offset);
      } else {
        offsetMinutes = 0;
        offsetStr = tz.offsetFormatted || "+00:00";
      }

      return {
        id: tz.id,
        name: tz.name,
        offset: offsetMinutes,
        offsetFormatted: offsetStr,
        abbreviation: tz.abbreviation || "",
        display: `${tz.name} (${offsetStr} ${tz.abbreviation || ""})`.trim(),
      };
    });
  }

  private formatOffset(offsetMinutes: number): string {
    if (typeof offsetMinutes !== "number" || isNaN(offsetMinutes)) {
      return "+00:00";
    }
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const minutes = Math.abs(offsetMinutes) % 60;
    const sign = offsetMinutes >= 0 ? "+" : "-";
    return `${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }

  // Fetch aggregated availability for date range
  async fetchAvailability(
    timezone: string,
    startDate: Date,
    endDate: Date,
    stepId: string
  ): Promise<AggregatedAvailabilityResponse> {
    const questionId = this.questionIds.get(stepId);
    if (!questionId) {
      console.warn(`[BloomApiClient] No questionId for step: ${stepId}`);
      return {};
    }

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const params = new URLSearchParams({
      tz: timezone,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      questionId,
    });

    const url = `${BLOOM_BASE_URL}/aggregated-availability/${this.accountId}?${params}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch availability: ${response.status}`);
    }

    const rawData: BloomAggregatedResponse = await response.json();
    const result: AggregatedAvailabilityResponse = {};

    if (rawData.dailySchedules && Array.isArray(rawData.dailySchedules)) {
      for (const day of rawData.dailySchedules) {
        if (day.date && day.schedule && day.schedule.length > 0) {
          result[day.date] = day.schedule.map(slot => ({
            start: slot.start,
            end: slot.end,
          }));
        }
      }
    } else {
      for (const key of Object.keys(rawData)) {
        if (key.match(/^\d{4}-\d{2}-\d{2}$/) && Array.isArray(rawData[key])) {
          result[key] = rawData[key] as AggregatedSlot[];
        }
      }
    }

    return result;
  }

  // Get question ID for a step
  getQuestionId(stepId: string): string | undefined {
    return this.questionIds.get(stepId);
  }
}

// Utility: Convert aggregated availability to TimeSlot array for a specific date
export function getTimeSlotsFromAggregated(
  aggregatedData: AggregatedAvailabilityResponse,
  selectedDate: Date,
  incrementMinutes: number = 30
): TimeSlot[] {
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const dateKey = formatDateKey(selectedDate);
  const windows = aggregatedData[dateKey];

  if (!windows || windows.length === 0) {
    return [];
  }

  const timeSlots: TimeSlot[] = [];

  for (const window of windows) {
    let startMinutes: number;
    let endMinutes: number;

    if (typeof window.start === "string" && window.start.match(/^\d{4}$/)) {
      const startHour = parseInt(window.start.substring(0, 2), 10);
      const startMin = parseInt(window.start.substring(2, 4), 10);
      startMinutes = startHour * 60 + startMin;

      const endHour = parseInt(window.end.substring(0, 2), 10);
      const endMin = parseInt(window.end.substring(2, 4), 10);
      endMinutes = endHour * 60 + endMin;
    } else if (typeof window.start === "string" && window.start.includes("T")) {
      const startDate = new Date(window.start);
      const endDate = new Date(window.end);
      startMinutes = startDate.getUTCHours() * 60 + startDate.getUTCMinutes();
      endMinutes = endDate.getUTCHours() * 60 + endDate.getUTCMinutes();
    } else {
      continue;
    }

    let currentMinutes = startMinutes;
    while (currentMinutes < endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;

      const displayHour = hours % 12 || 12;
      const ampm = hours < 12 ? "am" : "pm";
      const displayTime = `${displayHour.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}${ampm}`;

      const slotDate = new Date(selectedDate);
      slotDate.setHours(hours, mins, 0, 0);
      const utcValue = slotDate.toISOString().replace(".000Z", "+00:00");

      timeSlots.push({
        time: displayTime,
        value: utcValue,
      });

      currentMinutes += incrementMinutes;
    }
  }

  return timeSlots;
}

// Retry utility with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
