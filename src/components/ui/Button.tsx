import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant =
  | "ghost-icon" // icon-only, 30×30, transparent + border
  | "ghost" // text+icon, transparent + border
  | "elevated" // text+icon, bg-elevated + border (sidebar new request, etc)
  | "primary" // accent purple fill — ONLY for Send button
  | "danger-ghost" // transparent, hover red border+text
  | "danger-filled"; // red tint bg/border

type ButtonSize = "xs" | "sm" | "md" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  "ghost-icon":
    "bg-transparent border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]",
  ghost:
    "bg-transparent border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:border-[#3a3a4e]",
  elevated:
    "bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[#23232c] hover:border-[#3a3a4e]",
  primary:
    "bg-[var(--accent)] border-0 text-white hover:bg-[var(--accent-hover)] shadow-[0_2px_12px_rgba(124,110,250,0.4)]",
  "danger-ghost":
    "bg-transparent border border-[var(--border)] text-[var(--text-secondary)] hover:border-[#F87171] hover:text-[#F87171]",
  "danger-filled":
    "bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.3)] text-[#F87171] hover:bg-[rgba(248,113,113,0.16)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  icon: "w-[30px] h-[30px] rounded-[6px] p-0",
  xs: "h-[26px] px-[10px] rounded-[6px] text-[11.5px] font-medium",
  sm: "h-[34px] px-[14px] rounded-[7px] text-[12.5px] font-medium",
  md: "h-[40px] px-[20px] rounded-[8px] text-[13.5px] font-semibold",
};

export function Button({
  variant = "ghost",
  size = "sm",
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-[7px] shrink-0 cursor-pointer select-none transition-colors duration-100 font-[inherit]",
        variantClasses[variant],
        sizeClasses[size],
        disabled ? "opacity-50 cursor-not-allowed" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
