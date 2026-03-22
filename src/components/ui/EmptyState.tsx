import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-gray-light flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-gray-mid" />
        </div>
      )}
      <h3 className="font-display text-lg text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-mid max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
