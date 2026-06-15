import type { ButtonHTMLAttributes, ReactNode } from "react";

type TabVariant = "sidebar" | "underline";

interface TabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
  variant?: TabVariant;
  children?: ReactNode;
}

export function Tab({
  active,
  variant = "underline",
  className = "",
  children,
  ...props
}: TabProps) {
  if (variant === "sidebar") {
    return (
      <button
        {...props}
        className={[
          "flex-1 h-[30px] border-none rounded-[7px] font-[inherit] cursor-pointer transition-colors duration-100 text-[12px]",
          active
            ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold"
            : "bg-transparent text-[var(--text-secondary)] font-medium hover:text-[var(--text-primary)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      {...props}
      className={[
        "inline-flex items-center gap-[6px] h-[38px] px-[13px] bg-transparent border-none border-b-2 font-[inherit] cursor-pointer transition-colors duration-100 text-[13px] whitespace-nowrap",
        active
          ? "border-b-[var(--accent)] text-[var(--text-primary)] font-semibold"
          : "border-b-transparent text-[var(--text-secondary)] font-medium hover:text-[var(--text-primary)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
