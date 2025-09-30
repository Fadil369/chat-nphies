import { useTranslation } from "react-i18next";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <div className={`animate-spin ${sizeClasses[size]} ${className}`}>
      <svg 
        className="w-full h-full text-primary" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8v8H4z"
        />
      </svg>
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
  showSpinner?: boolean;
  className?: string;
}

export function LoadingState({ 
  message, 
  showSpinner = true, 
  className = "flex items-center justify-center p-8" 
}: LoadingStateProps) {
  const { t } = useTranslation();

  return (
    <div className={className}>
      <div className="text-center">
        {showSpinner && (
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
        )}
        <p className="text-sm text-gray-400">
          {message || t("loading")}
        </p>
      </div>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className = "h-4 bg-gray-700 rounded", count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`animate-pulse ${className}`} />
      ))}
    </>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-sm shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-1">
          <Skeleton className="h-3 w-16 bg-gray-600" />
          <Skeleton className="h-2 w-8 bg-gray-600" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full bg-gray-600" />
          <Skeleton className="h-4 w-3/4 bg-gray-600" />
        </div>
      </div>
    </div>
  );
}