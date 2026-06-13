import * as React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "text" | "error";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    // Base styles with smooth color and shadow transitions
    const baseStyles =
      "inline-flex items-center justify-center font-sans font-medium rounded-full transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed select-none";

    // Variant mapping to custom Material Design theme colors
    const variants = {
      primary: "bg-primary text-on-primary hover:brightness-90 hover:shadow-md shadow-sm",
      secondary: "bg-secondary text-on-secondary hover:brightness-90 hover:shadow-sm",
      outline: "border border-outline-variant bg-transparent text-primary hover:bg-primary/5 hover:shadow-sm",
      text: "bg-transparent text-primary hover:bg-primary/5",
      error: "bg-error text-on-error hover:brightness-90 hover:shadow-md shadow-sm",
    };

    // Size mappings
    const sizes = {
      sm: "px-sm py-1.5 text-label-md gap-sm",
      md: "px-md py-2.5 text-label-lg gap-sm",
      lg: "px-lg py-3 text-body-lg gap-md",
    };

    const isPending = loading;

    return (
      <button
        ref={ref}
        disabled={disabled || isPending}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isPending && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            fill="none"
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
