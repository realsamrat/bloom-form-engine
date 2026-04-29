"use client";

import AddressAutocomplete from "../ui/AddressAutocomplete";
import type { StepConfig, BloomFormData } from "../../types";

interface AddressStepProps {
  stepConfig: StepConfig;
  formData: BloomFormData;
  onUpdate: (data: Partial<BloomFormData>) => void;
  placesEndpoint?: string;
}

export default function AddressStep({
  stepConfig,
  formData,
  onUpdate,
  placesEndpoint,
}: AddressStepProps) {
  const address = (formData[stepConfig.id] as string) || '';

  return (
    <div className="space-y-4">
      <AddressAutocomplete
        label="Location"
        value={address}
        onChange={(value) => onUpdate({ [stepConfig.id]: value })}
        placeholder="Start typing a city or address..."
        endpoint={placesEndpoint}
      />

      <p className="text-sm text-[var(--bf-color-text-muted)]">
        City and state is sufficient, or include full address if you prefer
      </p>
    </div>
  );
}
