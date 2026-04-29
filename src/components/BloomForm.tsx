"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { BloomFormConfig, TimezoneData, AggregatedAvailabilityResponse } from "../types";
import { useBloomForm } from "../core/useBloomForm";
import FormButton from "./ui/FormButton";
import SuccessMessage from "./SuccessMessage";

// Step components
import DateStep from "./steps/DateStep";
import PersonalInfoStep from "./steps/PersonalInfoStep";
import AddressStep from "./steps/AddressStep";
import MultipleChoiceStep from "./steps/MultipleChoiceStep";
import TextStep from "./steps/TextStep";
import SummaryStep from "./steps/SummaryStep";

interface BloomFormProps {
  config: BloomFormConfig;
  stickyFooter?: boolean;
  onSuccess?: () => void;
}

// Cache for date step data to persist across step navigation
interface DateStepCache {
  timezones: TimezoneData[];
  availability: AggregatedAvailabilityResponse | null;
}

export default function BloomForm({ config, stickyFooter = false, onSuccess }: BloomFormProps) {
  const {
    state,
    currentStepConfig,
    apiClient,
    prevStep,
    setError,
    updateFormData,
    canProceed,
    initializeForm,
    handleNext,
    handleSubmit,
    handleReset: originalHandleReset,
  } = useBloomForm(config);

  const {
    currentStep,
    totalSteps,
    answerGroupId,
    isSubmitting,
    isSuccess,
    error,
    formData,
  } = state;

  const [showDateOverlay, setShowDateOverlay] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Cache for date step to avoid refetching on navigation
  const dateStepCacheRef = useRef<DateStepCache>({
    timezones: [],
    availability: null,
  });

  const handleDateCacheUpdate = useCallback((data: { timezones?: TimezoneData[]; availability?: AggregatedAvailabilityResponse }) => {
    if (data.timezones) {
      dateStepCacheRef.current.timezones = data.timezones;
    }
    if ('availability' in data) {
      // Explicitly passing availability (even as undefined) clears the cache,
      // which is needed when the user switches timezone.
      dateStepCacheRef.current.availability = data.availability ?? null;
    }
  }, []);

  // Wrap handleReset to also clear cache
  const handleReset = useCallback(() => {
    dateStepCacheRef.current = { timezones: [], availability: null };
    originalHandleReset();
  }, [originalHandleReset]);

  // Initialize answer group on mount
  useEffect(() => {
    if (!answerGroupId && !isSuccess) {
      initializeForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent when form submission succeeds
  useEffect(() => {
    if (isSuccess && onSuccess) {
      onSuccess();
    }
  }, [isSuccess, onSuccess]);

  const dismissError = useCallback(() => {
    setError(null);
  }, [setError]);

  // Render success state
  if (isSuccess) {
    const successTitle = config.successMessage?.title || "Thank You!";
    const successDescription = config.successMessage?.description || "Your request has been submitted successfully. We'll be in touch within 24 hours.";

    return (
      <div className="bg-[var(--bf-color-bg)] rounded-[var(--bf-radius-card)] border border-[var(--bf-color-border)]" style={{ fontFamily: 'var(--bf-font-body)' }}>
        <div className="p-6 md:p-8">
          <SuccessMessage
            onReset={handleReset}
            title={successTitle}
            description={successDescription}
          />
        </div>
      </div>
    );
  }

  const renderCurrentStep = () => {
    if (!currentStepConfig) return null;

    const commonProps = {
      stepConfig: currentStepConfig,
      formData,
      onUpdate: updateFormData,
    };

    switch (currentStepConfig.type) {
      case "date":
        return (
          <DateStep
            {...commonProps}
            onOverlayChange={setShowDateOverlay}
            apiClient={apiClient}
            cachedTimezones={dateStepCacheRef.current.timezones}
            cachedAvailability={dateStepCacheRef.current.availability}
            onCacheUpdate={handleDateCacheUpdate}
          />
        );
      case "personal_info":
        return <PersonalInfoStep {...commonProps} />;
      case "address":
        return <AddressStep {...commonProps} placesEndpoint={config.placesEndpoint} />;
      case "multiple_choice":
        return <MultipleChoiceStep {...commonProps} />;
      case "text":
      case "textarea":
        return <TextStep {...commonProps} />;
      case "summary":
        return <SummaryStep config={config} formData={formData} />;
      default:
        return null;
    }
  };

  const isLastStep = currentStep === totalSteps - 1;
  const isDateStep = currentStepConfig?.type === "date";

  return (
    <div className="relative bg-[var(--bf-color-bg)] rounded-[var(--bf-radius-card)] border border-[var(--bf-color-border)] w-full overflow-visible" style={{ fontFamily: 'var(--bf-font-body)' }}>
      {/* Header Section - Gray background */}
      <div className="bg-[var(--bf-color-bg-header)] border-b border-[var(--bf-color-border)] px-6 pt-5 pb-4 rounded-t-[11px]">
        <h2 className="font-bold text-[32px] leading-[1.2] text-black tracking-tight" style={{ fontFamily: 'var(--bf-font-heading)' }}>
          {currentStepConfig?.title || ""}
        </h2>
        <p className="text-sm text-black tracking-[0.14px] mt-2">
          {currentStepConfig?.description || ""}
        </p>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="border-b border-[var(--bf-color-border)]"
          >
            <div className="flex items-center justify-between p-4 bg-[var(--bf-color-error)]">
              <p className="text-sm text-white">{error}</p>
              <button
                type="button"
                onClick={dismissError}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                aria-label="Dismiss error"
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Section */}
      <div className={`relative px-6 pt-8 transition-[padding] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${showDateOverlay && isDateStep ? "pb-4" : "pb-8"}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={shouldReduceMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderCurrentStep()}
          </motion.div>
        </AnimatePresence>

        {/* Dark overlay - covers entire content area */}
        <AnimatePresence>
          {showDateOverlay && isDateStep && !shouldReduceMotion && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 bg-black/[0.08] z-10 pointer-events-none"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Footer Section - Buttons with top border */}
      <div className={`border-t border-[var(--bf-color-border)] px-[24px] pt-[16px] pb-[16px] bg-[var(--bf-color-bg)] ${stickyFooter ? "fixed bottom-0 left-0 right-0 z-[110]" : "rounded-b-[11px]"}`}>
        <div className="flex items-center justify-between">
          {/* Left side - close instruction when overlay is open */}
          <div className="flex-1">
            {showDateOverlay && isDateStep && (
              <p className="text-sm text-gray-500">
                Click X icon or press ESC to close
              </p>
            )}
          </div>

          {/* Right side - buttons */}
          <div className="flex gap-2.5">
            {currentStep > 0 && (
              <FormButton
                type="button"
                onClick={prevStep}
                variant="secondary"
                disabled={isSubmitting}
              >
                Back
              </FormButton>
            )}

            {!isLastStep ? (
              <FormButton
                type="button"
                onClick={handleNext}
                disabled={!canProceed() || isSubmitting}
                isLoading={isSubmitting}
              >
                Next
              </FormButton>
            ) : (
              <FormButton
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                isLoading={isSubmitting}
              >
                Submit
              </FormButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
