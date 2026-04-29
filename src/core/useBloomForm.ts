"use client";

import { useReducer, useCallback, useMemo, useRef, useEffect } from "react";
import type { BloomFormConfig, BloomFormState, BloomFormData, StepConfig } from "../types";
import { BloomApiClient, withRetry } from "./BloomApiClient";

type FormAction =
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GO_TO_STEP"; payload: number }
  | { type: "SET_ANSWER_GROUP_ID"; payload: string }
  | { type: "SET_SUBMITTING"; payload: boolean }
  | { type: "SET_SUCCESS"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "UPDATE_FORM_DATA"; payload: Partial<BloomFormData> }
  | { type: "RESET"; payload: BloomFormData };

function createInitialFormData(config: BloomFormConfig): BloomFormData {
  const data: BloomFormData = {};

  for (const step of config.steps) {
    switch (step.type) {
      case "date":
        data[`${step.id}_timezone`] = "";
        data[`${step.id}_value`] = "";
        break;
      case "personal_info":
        if (step.fields) {
          for (const field of step.fields) {
            data[field.name] = "";
          }
        }
        break;
      case "address":
        data[step.id] = "";
        break;
      case "multiple_choice":
        data[step.id] = step.singleSelect ? "" : [];
        break;
      case "text":
      case "textarea":
        data[step.id] = "";
        break;
    }
  }

  return data;
}

function createInitialState(config: BloomFormConfig): BloomFormState {
  return {
    currentStep: 0,
    totalSteps: config.steps.length,
    direction: 1,
    answerGroupId: null,
    isSubmitting: false,
    isSuccess: false,
    error: null,
    formData: createInitialFormData(config),
  };
}

function formReducer(state: BloomFormState, action: FormAction): BloomFormState {
  switch (action.type) {
    case "NEXT_STEP":
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, state.totalSteps - 1),
        direction: 1,
        error: null,
      };
    case "PREV_STEP":
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, 0),
        direction: -1,
        error: null,
      };
    case "GO_TO_STEP":
      return {
        ...state,
        currentStep: Math.max(0, Math.min(action.payload, state.totalSteps - 1)),
        direction: action.payload > state.currentStep ? 1 : -1,
        error: null,
      };
    case "SET_ANSWER_GROUP_ID":
      return {
        ...state,
        answerGroupId: action.payload,
      };
    case "SET_SUBMITTING":
      return {
        ...state,
        isSubmitting: action.payload,
        error: action.payload ? null : state.error,
      };
    case "SET_SUCCESS":
      return {
        ...state,
        isSuccess: action.payload,
        isSubmitting: false,
      };
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        isSubmitting: false,
      };
    case "UPDATE_FORM_DATA":
      return {
        ...state,
        formData: {
          ...state.formData,
          ...action.payload,
        },
      };
    case "RESET":
      return {
        currentStep: 0,
        totalSteps: state.totalSteps,
        direction: 1,
        answerGroupId: null,
        isSubmitting: false,
        isSuccess: false,
        error: null,
        formData: action.payload,
      };
    default:
      return state;
  }
}

export function useBloomForm(config: BloomFormConfig) {
  const initialFormData = useMemo(() => createInitialFormData(config), [config]);
  const initialState = useMemo(() => createInitialState(config), [config]);

  const [state, dispatch] = useReducer(formReducer, initialState);

  const apiClient = useMemo(() => new BloomApiClient(config), [config]);

  const apiClientRef = useRef(apiClient);
  useEffect(() => {
    apiClientRef.current = apiClient;
  }, [apiClient]);

  const nextStep = useCallback(() => {
    dispatch({ type: "NEXT_STEP" });
  }, []);

  const prevStep = useCallback(() => {
    dispatch({ type: "PREV_STEP" });
  }, []);

  const goToStep = useCallback((step: number) => {
    dispatch({ type: "GO_TO_STEP", payload: step });
  }, []);

  const setAnswerGroupId = useCallback((id: string) => {
    dispatch({ type: "SET_ANSWER_GROUP_ID", payload: id });
  }, []);

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    dispatch({ type: "SET_SUBMITTING", payload: isSubmitting });
  }, []);

  const setSuccess = useCallback((isSuccess: boolean) => {
    dispatch({ type: "SET_SUCCESS", payload: isSuccess });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: "SET_ERROR", payload: error });
  }, []);

  const updateFormData = useCallback((data: Partial<BloomFormData>) => {
    dispatch({ type: "UPDATE_FORM_DATA", payload: data });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET", payload: initialFormData });
  }, [initialFormData]);

  const currentStepConfig = useMemo(
    () => config.steps[state.currentStep],
    [config.steps, state.currentStep]
  );

  const canProceed = useCallback((): boolean => {
    const step = currentStepConfig;
    if (!step) return false;

    const { formData } = state;

    switch (step.type) {
      case "date":
        return Boolean(formData[`${step.id}_value`] && formData[`${step.id}_timezone`]);
      case "personal_info":
        if (step.fields) {
          return step.fields
            .filter(f => f.required !== false)
            .every(f => {
              const value = formData[f.name];
              return typeof value === "string" && value.trim().length > 0;
            });
        }
        return true;
      case "address": {
        if (step.required === false) return true;
        const addressValue = formData[step.id];
        return typeof addressValue === "string" && addressValue.length >= 3;
      }
      case "multiple_choice": {
        if (step.required === false) return true;
        const selectedOptions = formData[step.id];
        if (step.singleSelect) {
          return typeof selectedOptions === "string" && selectedOptions.length > 0;
        }
        return Array.isArray(selectedOptions) && selectedOptions.length > 0;
      }
      case "text":
      case "textarea": {
        if (step.required === false) return true;
        const textValue = formData[step.id];
        return typeof textValue === "string" && textValue.trim().length > 0;
      }
      case "summary":
        return true;
      default:
        return false;
    }
  }, [currentStepConfig, state.formData]);

  const buildPayload = useCallback((step: StepConfig): unknown => {
    const { formData } = state;

    switch (step.type) {
      case "date":
        return {
          timezone: formData[`${step.id}_timezone`] as string,
          value: formData[`${step.id}_value`] as string,
        };
      case "personal_info":
        if (step.fields) {
          const payload: Record<string, string> = {};
          for (const field of step.fields) {
            const apiKey = getBloomFieldKey(field.name, field.label);
            payload[apiKey] = formData[field.name] as string;
          }
          return payload;
        }
        return {};
      case "address":
        return formData[step.id] as string;
      case "multiple_choice":
        if (step.singleSelect) {
          const value = formData[step.id] as string;
          return value ? [value] : [];
        }
        return formData[step.id] as string[];
      case "text":
      case "textarea":
        return formData[step.id] as string;
      default:
        return null;
    }
  }, [state.formData]);

  const submitStepData = useCallback(async (): Promise<boolean> => {
    const step = currentStepConfig;
    if (!step || step.type === "summary") {
      return true;
    }

    if (!state.answerGroupId) {
      setError("Form not initialized. Please refresh the page.");
      return false;
    }

    setSubmitting(true);

    try {
      const payload = buildPayload(step);
      if (payload !== null) {
        await withRetry(() =>
          apiClientRef.current.submitAnswer(state.answerGroupId!, step.id, payload as never)
        );
      }

      setSubmitting(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save your information. Please try again.";
      setError(errorMessage);
      return false;
    }
  }, [currentStepConfig, state.answerGroupId, buildPayload, setSubmitting, setError]);

  const initializeForm = useCallback(async () => {
    try {
      const id = await withRetry(() => apiClientRef.current.createAnswerGroup());
      setAnswerGroupId(id);
    } catch {
      setError("Failed to initialize form. Please refresh the page.");
    }
  }, [setAnswerGroupId, setError]);

  const finalizeSubmission = useCallback(async (): Promise<boolean> => {
    if (!state.answerGroupId) {
      setError("Form not initialized. Please refresh the page.");
      return false;
    }

    setSubmitting(true);

    try {
      await withRetry(() => apiClientRef.current.finalizeSubmission(state.answerGroupId!));
      setSuccess(true);
      return true;
    } catch {
      setError("Failed to submit your request. Please try again.");
      return false;
    }
  }, [state.answerGroupId, setSubmitting, setSuccess, setError]);

  const handleNext = useCallback(async () => {
    const step = currentStepConfig;
    if (!step || !state.answerGroupId) return;

    if (step.type === "summary") {
      nextStep();
      return;
    }

    const payload = buildPayload(step);

    if (step.required === false && payload !== null) {
      const isEmpty =
        payload === "" ||
        (Array.isArray(payload) && payload.length === 0) ||
        (typeof payload === "string" && payload.trim() === "");
      if (isEmpty) {
        nextStep();
        return;
      }
    }

    setSubmitting(true);

    try {
      if (payload !== null) {
        await withRetry(() =>
          apiClientRef.current.submitAnswer(state.answerGroupId!, step.id, payload as never)
        );
      }
      setSubmitting(false);
      nextStep();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save. Please try again.";
      setError(errorMessage);
    }
  }, [currentStepConfig, state.answerGroupId, buildPayload, setSubmitting, setError, nextStep]);

  const handleSubmit = useCallback(async () => {
    const stepSaved = await submitStepData();
    if (!stepSaved) return;

    await finalizeSubmission();
  }, [submitStepData, finalizeSubmission]);

  const handleReset = useCallback(() => {
    reset();
    setTimeout(() => {
      initializeForm();
    }, 100);
  }, [reset, initializeForm]);

  return {
    state,
    config,
    currentStepConfig,
    apiClient,
    nextStep,
    prevStep,
    goToStep,
    setAnswerGroupId,
    setSubmitting,
    setSuccess,
    setError,
    updateFormData,
    reset,
    canProceed,
    submitStepData,
    initializeForm,
    finalizeSubmission,
    handleNext,
    handleSubmit,
    handleReset,
  };
}

function getBloomFieldKey(fieldName: string, label: string): string {
  const mappings: Record<string, string> = {
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email Address",
    phone: "Phone Number",
  };

  return mappings[fieldName] || label;
}

export type UseBloomFormReturn = ReturnType<typeof useBloomForm>;
