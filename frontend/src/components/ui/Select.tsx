import { useState, useRef, useEffect } from 'react';
import type { ReactNode, KeyboardEvent } from 'react';

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
  error?: string;
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
  error,
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
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

  const open = () => {
    if (disabled) return;
    setIsOpen(true);
    const current = options.findIndex((o) => o.value === value);
    setActiveIndex(current >= 0 ? current : 0);
  };

  const commit = (index: number) => {
    const option = options[index];
    if (option && !option.disabled) {
      onChange(option.value);
      setIsOpen(false);
    }
  };

  const moveActive = (dir: 1 | -1) => {
    if (options.length === 0) return;
    let i = activeIndex;
    for (let step = 0; step < options.length; step += 1) {
      i = (i + dir + options.length) % options.length;
      if (!options[i]?.disabled) break;
    }
    setActiveIndex(i);
  };

  // Full keyboard support so the custom dropdown is operable without a mouse.
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
      return;
    }
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveActive(-1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex >= 0) commit(activeIndex);
        break;
      default:
        break;
    }
  };

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
          className={`custom-select-trigger ${error ? 'custom-select-trigger--error' : ''} ${disabled ? 'custom-select-trigger--disabled' : ''}`}
          onClick={() => (isOpen ? setIsOpen(false) : open())}
          onKeyDown={onKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-invalid={error ? true : undefined}
        >
          <span className="custom-select-trigger-text">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <span
            className={`custom-select-arrow ${isOpen ? 'custom-select-arrow--open' : ''}`}
            aria-hidden="true"
          >
            ▾
          </span>
        </button>
        {isOpen && (
          <ul className="custom-select-options" role="listbox">
            {options.map((option, index) => (
              <li
                key={String(option.value)}
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled}
                className={`custom-select-option ${option.value === value ? 'custom-select-option--selected' : ''} ${index === activeIndex ? 'custom-select-option--active' : ''} ${option.disabled ? 'custom-select-option--disabled' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(index)}
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <span className="field-error-message">{error}</span>}
    </div>
  );
}
