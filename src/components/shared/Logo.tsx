import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  href?: string;
  variant?: "full" | "icon";
}

export function Logo({ size = "md", className, href = "/", variant = "full" }: LogoProps) {
  const sizes = { sm: 32, md: 48, lg: 64 };
  const imgSize = sizes[size];

  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/logo.png"
        alt="The Deposit"
        width={imgSize}
        height={imgSize}
        className="rounded-full"
      />
      {variant === "full" && (
        <span
          className="font-display text-primary tracking-widest uppercase"
          style={{ fontSize: size === "sm" ? "14px" : size === "md" ? "18px" : "24px" }}
        >
          The Deposit
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
