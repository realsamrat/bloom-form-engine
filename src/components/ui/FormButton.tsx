"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

interface FormButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  isLoading?: boolean;
}

const FormButton = forwardRef<HTMLButtonElement, FormButtonProps>(
  (
    {
      variant = "primary",
      fullWidth = false,
      isLoading = false,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      rounded-[var(--bf-radius)] font-medium tracking-[0.16px]
      transition-[transform,background-color,opacity] duration-100 ease-out text-center
      py-[12px] text-[16px]
      disabled:cursor-not-allowed
      active:scale-[0.97] disabled:active:scale-100
      motion-reduce:transition-none motion-reduce:active:scale-100
    `;

    const variantStyles = {
      primary: "bg-black text-white px-[32px] hover:bg-black/90 disabled:bg-black/50",
      secondary: `bg-white text-black border border-black px-[20px]
        hover:bg-gray-50
        disabled:opacity-30 disabled:hover:bg-white`,
    };

    const widthStyles = fullWidth ? "w-full" : "";

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${widthStyles} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

FormButton.displayName = "FormButton";

export default FormButton;
