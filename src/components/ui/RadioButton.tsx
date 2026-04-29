"use client";

import { forwardRef, InputHTMLAttributes } from "react";

interface RadioButtonProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
}

const RadioButton = forwardRef<HTMLInputElement, RadioButtonProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const radioId = id || `${props.name}-${props.value}`;

    return (
      <div className="w-full">
        <label
          htmlFor={radioId}
          className={`
            flex items-center gap-3 p-4 bg-[var(--bf-color-bg)] border rounded-[var(--bf-radius)]
            cursor-pointer transition-[transform,border-color,background-color] duration-100 ease-out
            hover:border-[var(--bf-color-accent)] active:scale-[0.98]
            motion-reduce:transition-none motion-reduce:active:scale-100
            ${props.checked ? "border-black bg-[var(--bf-color-accent)]" : "border-[var(--bf-color-border-idle)]"}
            ${error ? "border-[var(--bf-color-error)]" : ""}
            ${className}
          `}
        >
          <div className="relative flex-shrink-0">
            <input
              ref={ref}
              type="radio"
              id={radioId}
              className="sr-only"
              {...props}
            />
            <div
              className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center
                transition-colors duration-100 ease-out
                motion-reduce:transition-none
                ${props.checked
                  ? "bg-white border-black"
                  : "bg-white border-gray-300"
                }
              `}
            >
              <div
                className={`
                  w-2.5 h-2.5 rounded-full bg-black
                  transition-transform duration-100 ease-out
                  motion-reduce:transition-none
                  ${props.checked ? "scale-100" : "scale-0"}
                `}
              />
            </div>
          </div>
          <span className="text-base text-[var(--bf-color-text)]">{label}</span>
        </label>
        {error && (
          <p className="mt-1.5 text-sm text-[var(--bf-color-error)]">{error}</p>
        )}
      </div>
    );
  }
);

RadioButton.displayName = "RadioButton";

export default RadioButton;
