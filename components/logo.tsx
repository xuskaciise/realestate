import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, showText = true, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  const imageSizes = {
    sm: 32,
    md: 48,
    lg: 64,
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("relative flex items-center justify-center", sizeClasses[size])}>
        <Image
          src="/siu_logo.png"
          alt="Somali International University Logo"
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="object-contain"
          priority
        />
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span className="text-lg font-bold text-foreground">
            Somali International
          </span>
          <span className="text-sm text-muted-foreground">University</span>
        </div>
      )}
    </div>
  );
}
