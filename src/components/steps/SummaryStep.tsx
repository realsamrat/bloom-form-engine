"use client";

import type { BloomFormConfig, BloomFormData } from "../../types";

interface SummaryStepProps {
  config: BloomFormConfig;
  formData: BloomFormData;
}

function formatDateTime(isoString: string, timezone: string): string {
  if (!isoString) return "Not selected";

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Not selected";

    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone || "America/New_York",
    };

    return date.toLocaleString("en-US", options);
  } catch {
    return "Not selected";
  }
}

interface SummaryItemProps {
  label: string;
  value: string | string[];
}

function SummaryItem({ label, value }: SummaryItemProps) {
  const displayValue = Array.isArray(value)
    ? value.length > 0 ? value.join(", ") : "None selected"
    : value || "Not provided";

  return (
    <div className="py-3 border-b border-[var(--bf-color-border)] last:border-b-0">
      <p className="text-sm text-[var(--bf-color-text-muted)] mb-1">{label}</p>
      <p className="text-base text-[var(--bf-color-text)]">{displayValue}</p>
    </div>
  );
}

export default function SummaryStep({ config, formData }: SummaryStepProps) {
  const summaryItems: { label: string; value: string | string[] }[] = [];

  for (const step of config.steps) {
    if (step.type === 'summary') continue;

    switch (step.type) {
      case 'date': {
        const timezone = (formData[`${step.id}_timezone`] as string) || '';
        const dateValue = (formData[`${step.id}_value`] as string) || '';
        summaryItems.push({
          label: step.title,
          value: formatDateTime(dateValue, timezone),
        });
        break;
      }
      case 'personal_info': {
        if (step.fields) {
          const firstName = formData['firstName'] as string;
          const lastName = formData['lastName'] as string;
          if (firstName || lastName) {
            summaryItems.push({
              label: 'Name',
              value: `${firstName || ''} ${lastName || ''}`.trim() || 'Not provided',
            });
          }

          for (const field of step.fields) {
            if (field.name === 'firstName' || field.name === 'lastName') continue;
            summaryItems.push({
              label: field.label,
              value: (formData[field.name] as string) || '',
            });
          }
        }
        break;
      }
      case 'address': {
        summaryItems.push({
          label: step.title,
          value: (formData[step.id] as string) || '',
        });
        break;
      }
      case 'multiple_choice': {
        summaryItems.push({
          label: step.title,
          value: (formData[step.id] as string[]) || [],
        });
        break;
      }
      case 'text':
      case 'textarea': {
        summaryItems.push({
          label: step.title,
          value: (formData[step.id] as string) || '',
        });
        break;
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-[var(--bf-color-bg-header)] rounded-[var(--bf-radius)] p-4">
        {summaryItems.map((item, index) => (
          <SummaryItem key={index} label={item.label} value={item.value} />
        ))}
      </div>

      <p className="text-sm text-[var(--bf-color-text-muted)] text-center">
        By submitting, you agree to be contacted about our products and services.
      </p>
    </div>
  );
}
