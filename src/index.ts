// BloomForm Engine - Public API
// ========================================

// Main component
export { default as BloomForm } from './components/BloomForm';

// Types
export type {
  BloomFormConfig,
  StepConfig,
  FieldConfig,
  BloomFormData,
  BloomFormState,
  BloomEngineConfig,
  TimezoneData,
  TimeSlot,
  AggregatedAvailabilityResponse,
  AggregatedSlot,
  DatePayload,
  PersonalInfoPayload,
} from './types';

// Core (for advanced usage)
export { useBloomForm } from './core/useBloomForm';
export type { UseBloomFormReturn } from './core/useBloomForm';
export { BloomApiClient, getTimeSlotsFromAggregated, withRetry } from './core/BloomApiClient';

// Theme CSS path (for importing in consuming projects)
// Usage: import 'bloom-form-engine/src/theme.css';
