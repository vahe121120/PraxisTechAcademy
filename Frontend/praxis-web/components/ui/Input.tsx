import { forwardRef, useId } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = "", ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-ink-700">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`rounded-lg border px-3.5 py-2.5 text-sm text-ink-900-solid outline-none transition-colors placeholder:text-ink-300 ${
            error
              ? "border-danger-500 focus:border-danger-500"
              : "border-ink-100 focus:border-brand-500"
          } ${className}`}
          {...rest}
        />
        {error ? (
          <p id={errorId} role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-sm text-ink-500">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
