import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface SelectOption<T> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

interface SelectProps<T> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Select<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  label,
  required,
  disabled,
  className = '',
  id,
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className={`custom-select-container ${className}`} id={id}>
      {label && (
        <span className="field-label">
          {label} {required && <span className="field-required">*</span>}
        </span>
      )}
      <div className="custom-select-wrapper">
        <button
          type="button"
          className={`custom-select-trigger ${disabled ? 'custom-select-trigger--disabled' : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className="custom-select-trigger-text">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <span className={`custom-select-arrow ${isOpen ? 'custom-select-arrow--open' : ''}`} aria-hidden="true">
            ▾
          </span>
        </button>
        {isOpen && (
          <ul className="custom-select-options">
            {options.map((option) => (
              <li
                key={String(option.value)}
                className={`custom-select-option ${option.value === value ? 'custom-select-option--selected' : ''} ${option.disabled ? 'custom-select-option--disabled' : ''}`}
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value);
                    setIsOpen(false);
                  }
                }}
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
