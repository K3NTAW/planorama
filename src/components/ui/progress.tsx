import React from "react";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
}

export function Progress({ value, className, ...props }: ProgressProps) {
  return (
    <div
      className={
        "relative w-full bg-muted rounded overflow-hidden h-2 " + (className || "")
      }
      {...props}
    >
      <div
        className="absolute left-0 top-0 h-full bg-primary transition-all duration-300"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
} 