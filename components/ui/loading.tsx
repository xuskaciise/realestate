import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-6 w-6 border-2",
    md: "h-12 w-12 border-b-2",
    lg: "h-16 w-16 border-b-2",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-blue-600",
        sizeClasses[size],
        className
      )}
    />
  );
}

interface LoadingOverlayProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingOverlay({ message = "Loading...", size = "md" }: LoadingOverlayProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] space-y-4">
      <div className="text-center">
        <LoadingSpinner size={size} />
        {message && (
          <p className="mt-4 text-muted-foreground">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

interface LoadingInlineProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingInline({ message, size = "sm" }: LoadingInlineProps) {
  return (
    <div className="flex items-center gap-2">
      <LoadingSpinner size={size} />
      {message && (
        <span className="text-muted-foreground text-sm font-medium">
          {message}
        </span>
      )}
    </div>
  );
}
