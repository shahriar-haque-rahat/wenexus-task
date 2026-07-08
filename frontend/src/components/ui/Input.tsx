import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({
  label,
  error,
  id,
  className = '',
  required,
  ...props
}: InputProps) {
  return (
    <div className={`field-wrapper ${className}`}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label} {required && <span className="field-required">*</span>}
        </label>
      )}
      <input
        id={id}
        required={required}
        className={`custom-input ${error ? 'custom-input--error' : ''}`}
        {...props}
      />
      {error && <span className="field-error-message">{error}</span>}
    </div>
  );
}

