"use client";

import Checkbox from "../ui/Checkbox";
import RadioButton from "../ui/RadioButton";
import type { StepConfig, BloomFormData } from "../../types";

interface MultipleChoiceStepProps {
  stepConfig: StepConfig;
  formData: BloomFormData;
  onUpdate: (data: Partial<BloomFormData>) => void;
}

export default function MultipleChoiceStep({
  stepConfig,
  formData,
  onUpdate,
}: MultipleChoiceStepProps) {
  const options = stepConfig.options || [];
  const isSingleSelect = stepConfig.singleSelect === true;

  const selectedValue = formData[stepConfig.id];
  const selectedOptions = isSingleSelect
    ? (selectedValue ? [selectedValue as string] : [])
    : ((selectedValue as string[]) || []);

  const handleSingleSelect = (value: string) => {
    onUpdate({ [stepConfig.id]: value });
  };

  const handleMultiSelect = (value: string) => {
    const newOptions = selectedOptions.includes(value)
      ? selectedOptions.filter((opt) => opt !== value)
      : [...selectedOptions, value];

    onUpdate({ [stepConfig.id]: newOptions });
  };

  if (isSingleSelect) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => (
          <RadioButton
            key={option.value}
            name={stepConfig.id}
            value={option.value}
            label={option.label}
            checked={selectedValue === option.value}
            onChange={() => handleSingleSelect(option.value)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option) => (
        <Checkbox
          key={option.value}
          name={`${stepConfig.id}-${option.value}`}
          label={option.label}
          checked={selectedOptions.includes(option.value)}
          onChange={() => handleMultiSelect(option.value)}
        />
      ))}
    </div>
  );
}
