import React, { useEffect } from 'react';
import { useReducedMotion } from '../hooks/useAccessibility';

interface AnimatedElementProps {
  children: React.ReactNode;
  animation: 'fadeIn' | 'slideUp' | 'pulse' | 'bounce';
  duration?: number;
  delay?: number;
  className?: string;
}

export function AnimatedElement({ 
  children, 
  animation, 
  duration = 300, 
  delay = 0, 
  className = '' 
}: AnimatedElementProps) {
  const prefersReducedMotion = useReducedMotion();

  const animationClasses = {
    fadeIn: prefersReducedMotion ? '' : 'animate-fade-in',
    slideUp: prefersReducedMotion ? '' : 'animate-slide-up',
    pulse: prefersReducedMotion ? '' : 'animate-pulse',
    bounce: prefersReducedMotion ? '' : 'animate-bounce'
  };

  const style = prefersReducedMotion ? {} : {
    animationDuration: `${duration}ms`,
    animationDelay: `${delay}ms`
  };

  return (
    <div 
      className={`${animationClasses[animation]} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

interface AccessibleLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function AccessibleLoading({ 
  message = 'Loading', 
  size = 'md', 
  showText = true,
  className = '' 
}: AccessibleLoadingProps) {
  const prefersReducedMotion = useReducedMotion();

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div 
      className={`flex items-center gap-3 ${className}`}
      role="status"
      aria-label={message}
    >
      <div 
        className={`${sizeClasses[size]} border-2 border-primary/30 border-t-primary rounded-full ${
          prefersReducedMotion ? '' : 'animate-spin'
        }`}
        aria-hidden="true"
      />
      {showText && (
        <span className="text-sm text-gray-400" aria-live="polite">
          {message}...
        </span>
      )}
      <span className="sr-only">{message}, please wait</span>
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  className?: string;
}

export function AccessibleProgressBar({ 
  value, 
  max = 100, 
  label = 'Progress',
  className = '' 
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>{label}</span>
          <span aria-live="polite">{Math.round(percentage)}%</span>
        </div>
      )}
      <div 
        className="w-full bg-gray-700 rounded-full h-2"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

export function AccessibleToast({ 
  message, 
  type, 
  onClose, 
  autoClose = true, 
  duration = 5000 
}: ToastProps) {
  const prefersReducedMotion = useReducedMotion();

  const typeStyles = {
    success: 'bg-green-600 border-green-500',
    error: 'bg-red-600 border-red-500',
    warning: 'bg-yellow-600 border-yellow-500',
    info: 'bg-blue-600 border-blue-500'
  };

  const typeIcons = {
    success: '✓',
    error: '⚠',
    warning: '⚠',
    info: 'ℹ'
  };

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  return (
    <AnimatedElement animation="slideUp" className="fixed top-4 right-4 z-50">
      <div 
        className={`${typeStyles[type]} text-white p-4 rounded-lg border shadow-lg max-w-sm`}
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start gap-3">
          <span 
            className="flex-shrink-0 text-lg"
            aria-hidden="true"
          >
            {typeIcons[type]}
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
            aria-label="Close notification"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>
    </AnimatedElement>
  );
}

// Add to global CSS or Tailwind config
const animationStyles = `
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { 
    opacity: 0; 
    transform: translateY(20px);
  }
  to { 
    opacity: 1; 
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .animate-fade-in,
  .animate-slide-up,
  .animate-pulse,
  .animate-bounce,
  .animate-spin {
    animation: none !important;
  }
}
`;