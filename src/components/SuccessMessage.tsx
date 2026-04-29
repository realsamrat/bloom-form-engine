"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import FormButton from "./ui/FormButton";

interface SuccessMessageProps {
  onReset: () => void;
  autoResetDelay?: number;
  title?: string;
  description?: string;
}

export default function SuccessMessage({
  onReset,
  autoResetDelay = 30000,
  title = "Thank You!",
  description = "Your request has been submitted successfully. We'll be in touch within 24 hours.",
}: SuccessMessageProps) {
  // Auto-reset after delay
  useEffect(() => {
    const timer = setTimeout(onReset, autoResetDelay);
    return () => clearTimeout(timer);
  }, [onReset, autoResetDelay]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="text-center py-8"
    >
      {/* Checkmark animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.1,
        }}
        className="w-20 h-20 mx-auto mb-6 bg-[var(--bf-color-success-bg)] rounded-full flex items-center justify-center"
      >
        <motion.svg
          className="w-10 h-10 text-[var(--bf-color-success-text)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
        >
          <motion.path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
          />
        </motion.svg>
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="font-[var(--bf-font-heading)] font-bold text-3xl text-[var(--bf-color-text)] mb-3"
      >
        {title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="font-[var(--bf-font-body)] text-gray-600 mb-8 max-w-sm mx-auto"
      >
        {description}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <FormButton type="button" onClick={onReset} variant="secondary">
          Submit Another Request
        </FormButton>
      </motion.div>
    </motion.div>
  );
}
