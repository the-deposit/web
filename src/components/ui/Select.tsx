import { cn } from "@/lib/utils";
import { type SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, id, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-primary mb-1"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={cn(
            "w-full border rounded px-3 py-2 font-body text-sm bg-secondary text-primary",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200",
            "appearance-none cursor-pointer",
            error ? "border-error focus:ring-error" : "border-border",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {hint && !error && (
          <p className="mt-1 text-xs text-gray-mid">{hint}</p>
        )}
        {error && (
          <p className="mt-1 text-xs text-error">{error}</p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
