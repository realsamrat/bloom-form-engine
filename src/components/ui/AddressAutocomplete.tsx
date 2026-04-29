"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface Prediction {
  description: string;
  place_id: string;
}

interface AddressAutocompleteProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  /** API endpoint for Google Places autocomplete. Configurable per project. */
  endpoint?: string;
}

export default function AddressAutocomplete({
  label,
  value,
  onChange,
  placeholder = "Start typing your address...",
  error,
  endpoint = "/api/google/places/autocomplete",
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputId = "address-autocomplete";

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${endpoint}?input=${encodeURIComponent(input)}`
      );
      const data = await response.json();

      if (data.predictions && Array.isArray(data.predictions)) {
        setSuggestions(data.predictions);
        setIsOpen(data.predictions.length > 0);
        setHighlightedIndex(-1);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch (err) {
      console.error("Failed to fetch address suggestions:", err);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  // Debounced input handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  }, [onChange, fetchSuggestions]);

  // Handle suggestion selection
  const handleSelect = useCallback((suggestion: Prediction) => {
    onChange(suggestion.description);
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, [onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  }, [isOpen, suggestions, highlightedIndex, handleSelect]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full relative" ref={containerRef}>
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
          id={inputId}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= 2 && suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="address-suggestions"
          className={`
            w-full px-[16px] py-[14px] bg-transparent
            text-[16px] text-[var(--bf-color-text)] tracking-[0.16px]
            placeholder:text-[var(--bf-color-text-muted)] placeholder:text-[14px] placeholder:tracking-[0.14px]
            focus:outline-none
            rounded-[var(--bf-radius)]
          `}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          id="address-suggestions"
          role="listbox"
          className="absolute top-full left-0 right-0 z-20 mt-1 bg-[var(--bf-color-bg)] border border-[var(--bf-color-border)] rounded-[var(--bf-radius)] shadow-lg overflow-hidden origin-top bf-animate-dropdown-enter"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.place_id}
              role="option"
              aria-selected={highlightedIndex === index}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`
                px-4 py-3 cursor-pointer text-sm transition-colors duration-75 ease-out
                motion-reduce:transition-none
                ${highlightedIndex === index ? "bg-gray-100" : "hover:bg-gray-50"}
              `}
            >
              {suggestion.description}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-1.5 text-sm text-[var(--bf-color-error)]">{error}</p>
      )}
    </div>
  );
}
