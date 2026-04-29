"use client";

import { forwardRef, TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const textareaId = id || props.name;

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
              htmlFor={textareaId}
              className="absolute top-[-15px] left-[11px] px-[6px] py-[4px] bg-[var(--bf-color-bg)] text-[16px] text-[var(--bf-color-text)] font-normal tracking-[0.16px]"
            >
              {label}
            </label>
          )}
          <textarea
            ref={ref}
            id={textareaId}
            className={`
              w-full px-[16px] py-[14px] bg-transparent
              text-[16px] text-[var(--bf-color-text)] tracking-[0.16px]
              placeholder:text-[var(--bf-color-text-muted)] placeholder:text-[14px] placeholder:tracking-[0.14px]
              focus:outline-none
              resize-none
              rounded-[var(--bf-radius)]
              ${className}
            `}
            rows={4}
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

Textarea.displayName = "Textarea";

export default Textarea;
