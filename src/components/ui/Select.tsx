"use client";

import { forwardRef, SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = "", id, ...props }, ref) => {
    const selectId = id || props.name;

    return (
      <div className="w-full relative">
        <div
          className={`
            relative border rounded-[var(--bf-radius)]
            transition-all duration-150 ease
            ${error ? "border-[var(--bf-color-error)]" : "border-[var(--bf-color-border)] focus-within:border-black"}
          `}
        >
          {label && (
            <label
              htmlFor={selectId}
              className="absolute top-[-15px] left-[11px] px-[6px] py-[4px] bg-[var(--bf-color-bg)] text-[16px] text-[var(--bf-color-text)] font-normal tracking-[0.16px] z-10"
            >
              {label}
            </label>
          )}
          <select
            ref={ref}
            id={selectId}
            className={`
              w-full px-[16px] py-[14px] bg-transparent
              text-[16px] text-[var(--bf-color-text)] tracking-[0.16px]
              focus:outline-none
              appearance-none cursor-pointer
              rounded-[var(--bf-radius)]
              ${!props.value && placeholder ? "text-[var(--bf-color-text-muted)]" : ""}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
            <svg
              className="h-4 w-4 text-black"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-[var(--bf-color-error)]">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
