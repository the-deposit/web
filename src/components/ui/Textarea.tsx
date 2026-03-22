import { cn } from "@/lib/utils";
import { type TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
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
        <textarea
          ref={ref}
          id={id}
          className={cn(
            "w-full border rounded px-3 py-2 font-body text-sm bg-secondary text-primary placeholder-gray-mid",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 resize-y",
            error ? "border-error focus:ring-error" : "border-border",
            className
          )}
          {...props}
        />
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
Textarea.displayName = "Textarea";

export { Textarea };
