"use client";

import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import type { StepConfig, BloomFormData } from "../../types";

interface PersonalInfoStepProps {
  stepConfig: StepConfig;
  formData: BloomFormData;
  onUpdate: (data: Partial<BloomFormData>) => void;
}

export default function PersonalInfoStep({
  stepConfig,
  formData,
  onUpdate,
}: PersonalInfoStepProps) {
  const fields = stepConfig.fields || [];

  const nameFields = fields.filter(f => f.name === 'firstName' || f.name === 'lastName');
  const stackedFields = fields.filter(f => f.name !== 'firstName' && f.name !== 'lastName' && f.type !== 'textarea');
  const textareaFields = fields.filter(f => f.type === 'textarea');

  return (
    <div className="space-y-6">
      {nameFields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nameFields.map((field) => (
            <Input
              key={field.name}
              label={field.label}
              name={field.name}
              type="text"
              value={(formData[field.name] as string) || ''}
              onChange={(e) => onUpdate({ [field.name]: e.target.value })}
              placeholder={field.placeholder || ''}
              autoComplete={getAutoComplete(field.name, field.type)}
            />
          ))}
        </div>
      )}

      {stackedFields.map((field) => (
        <Input
          key={field.name}
          label={field.label}
          name={field.name}
          type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'}
          inputMode={field.type === 'tel' ? 'numeric' : undefined}
          value={(formData[field.name] as string) || ''}
          onChange={(e) => {
            if (field.type === 'tel') {
              const numericValue = e.target.value.replace(/[^0-9]/g, '');
              onUpdate({ [field.name]: numericValue });
            } else {
              onUpdate({ [field.name]: e.target.value });
            }
          }}
          placeholder={field.placeholder || ''}
          autoComplete={getAutoComplete(field.name, field.type)}
        />
      ))}

      {textareaFields.map((field) => (
        <Textarea
          key={field.name}
          label={field.label}
          name={field.name}
          value={(formData[field.name] as string) || ''}
          onChange={(e) => onUpdate({ [field.name]: e.target.value })}
          placeholder={field.placeholder || ''}
          rows={4}
        />
      ))}
    </div>
  );
}

function getAutoComplete(fieldName: string, fieldType: string): string {
  const nameMap: Record<string, string> = {
    firstName: 'given-name',
    lastName: 'family-name',
    email: 'email',
    phone: 'tel',
    name: 'name',
    fullName: 'name',
  };

  if (nameMap[fieldName]) {
    return nameMap[fieldName];
  }

  if (fieldType === 'email') return 'email';
  if (fieldType === 'tel') return 'tel';

  return 'off';
}
