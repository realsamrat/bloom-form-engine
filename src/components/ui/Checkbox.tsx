"use client";

import { forwardRef, InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const checkboxId = id || props.name;

    return (
      <div className="w-full">
        <label
          htmlFor={checkboxId}
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
              type="checkbox"
              id={checkboxId}
              className="sr-only"
              {...props}
            />
            <div
              className={`
                w-5 h-5 rounded-md border-2 flex items-center justify-center
                transition-colors duration-100 ease-out
                motion-reduce:transition-none
                ${props.checked
                  ? "bg-black border-black"
                  : "bg-white border-gray-300"
                }
              `}
            >
              <svg
                className={`
                  w-3 h-3 text-white
                  transition-transform duration-100 ease-out
                  motion-reduce:transition-none
                  ${props.checked ? "scale-100" : "scale-0"}
                `}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
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

Checkbox.displayName = "Checkbox";

export default Checkbox;
