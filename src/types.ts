// BloomForm Engine - Type Definitions

// ========================================
// Form Configuration Types
// ========================================

export interface BloomFormConfig {
  // API Configuration
  accountId: string;
  formId: string;

  // Steps Configuration
  steps: StepConfig[];

  // Optional settings
  placesEndpoint?: string;
  proxyBaseUrl?: string;

  // Optional
  successMessage?: {
    title: string;
    description: string;
  };
}

export interface StepConfig {
  id: string;
  questionId: string;
  title: string;
  description: string;
  type: 'date' | 'personal_info' | 'address' | 'multiple_choice' | 'text' | 'textarea' | 'summary';

  // For multiple_choice type
  options?: { value: string; label: string }[];
  singleSelect?: boolean; // If true, only one option can be selected (radio behavior)

  // Field configuration for personal_info type
  fields?: FieldConfig[];

  // Validation
  required?: boolean;
  validation?: (value: unknown) => boolean;
}

export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea';
  placeholder?: string;
  required?: boolean;
}

// ========================================
// Form State Types
// ========================================

// Form data that gets populated dynamically based on config
export type BloomFormData = Record<string, unknown>;

// Form state managed by the hook
export interface BloomFormState {
  currentStep: number;
  totalSteps: number;
  direction: 1 | -1;
  answerGroupId: string | null;
  isSubmitting: boolean;
  isSuccess: boolean;
  error: string | null;
  formData: BloomFormData;
}

// ========================================
// API Payload Types
// ========================================

export interface DatePayload {
  timezone: string;
  value: string;
}

export interface PersonalInfoPayload {
  [key: string]: string;
}

// ========================================
// Timezone & Availability Types
// ========================================

// Timezone data from API
export interface TimezoneData {
  id?: string;
  name: string;
  offset: number;
  offsetFormatted: string;
  abbreviation: string;
  display: string;
}

// Time slot for date picker
export interface TimeSlot {
  time: string;
  value: string;
}

// Aggregated availability response
export interface AggregatedSlot {
  start: string;
  end: string;
}

export interface AggregatedAvailabilityResponse {
  [date: string]: AggregatedSlot[];
}

// ========================================
// Engine Configuration Types (for CLI)
// ========================================

export interface BloomEngineConfig {
  outputDir: string;
  placesEndpoint: string;
  theme: 'default' | 'dark' | 'custom';
  accounts?: Record<string, { accountId: string }>;
}
