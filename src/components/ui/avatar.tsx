import * as React from "react"
import { cn } from "@/lib/utils"
import Image from "next/image"

// AvatarProps interface removed as it was empty and redundant

const Avatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = "Avatar"

const AvatarImage = ({ className, src, alt = "", ...props }: { className?: string; src?: string; alt?: string } & React.ComponentProps<typeof Image>) => {
  if (!src) return null;
  return (
    <Image
      className={cn("aspect-square h-full w-full", className)}
      src={src}
      alt={alt}
      fill
      {...props}
    />
  );
};
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback } 