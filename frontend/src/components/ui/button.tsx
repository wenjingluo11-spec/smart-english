"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", style, disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none";

    const variantStyles: Record<Variant, { className: string; style: React.CSSProperties }> = {
      primary: {
        className: "text-white hover:brightness-110",
        style: {
          background: "var(--color-primary)",
          boxShadow: "0 4px 14px color-mix(in srgb, var(--color-primary) 30%, transparent)",
        },
      },
      secondary: {
        className: "hover:brightness-95",
        style: {
          background: "var(--color-surface)",
          color: "var(--color-text)",
          border: "1.5px solid var(--color-border)",
        },
      },
      ghost: {
        className: "hover:opacity-80",
        style: {
          background: "transparent",
          color: "var(--color-text-secondary)",
        },
      },
      danger: {
        className: "text-white hover:brightness-110",
        style: {
          background: "#ef4444",
          boxShadow: "0 4px 14px rgba(239, 68, 68, 0.25)",
        },
      },
    };

    const v = variantStyles[variant];

    return (
      <button
        ref={ref}
        className={`${base} ${sizeStyles[size]} ${v.className} ${className}`}
        style={{ ...v.style, ...style }}
        disabled={disabled}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
export default Button;
