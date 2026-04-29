"use client";

import { forwardRef, InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full relative">
        <div
          className={`
            relative border rounded-[var(--bf-radius)]
            transition-colors duration-100 ease-out
            motion-reduce:transition-none
            ${error ? "border-[var(--bf-color-error)]" : "border-[var(--bf-color-border)] focus-within:border-black"}
          `}
        >
          {label && (
            <label
              htmlFor={inputId}
              className="absolute top-[-15px] left-[11px] px-[6px] py-[4px] bg-[var(--bf-color-bg)] text-[16px] text-[var(--bf-color-text)] font-normal tracking-[0.16px]"
            >
              {label}
            </label>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full px-[16px] py-[14px] bg-transparent
              text-[16px] text-[var(--bf-color-text)] tracking-[0.16px]
              placeholder:text-[var(--bf-color-text-muted)] placeholder:text-[14px] placeholder:tracking-[0.14px]
              focus:outline-none
              rounded-[var(--bf-radius)]
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-[var(--bf-color-error)]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
