"use client";

import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import type { StepConfig, BloomFormData } from "../../types";

interface TextStepProps {
  stepConfig: StepConfig;
  formData: BloomFormData;
  onUpdate: (data: Partial<BloomFormData>) => void;
}

export default function TextStep({
  stepConfig,
  formData,
  onUpdate,
}: TextStepProps) {
  const value = (formData[stepConfig.id] as string) || '';
  const isTextarea = stepConfig.type === 'textarea';

  if (isTextarea) {
    return (
      <div>
        <Textarea
          label={stepConfig.title}
          name={stepConfig.id}
          value={value}
          onChange={(e) => onUpdate({ [stepConfig.id]: e.target.value })}
          placeholder="Tell us about your event, special requests, or any questions..."
          rows={5}
        />
      </div>
    );
  }

  return (
    <div>
      <Input
        label={stepConfig.title}
        name={stepConfig.id}
        type="text"
        value={value}
        onChange={(e) => onUpdate({ [stepConfig.id]: e.target.value })}
        placeholder="Enter your response..."
      />
    </div>
  );
}
