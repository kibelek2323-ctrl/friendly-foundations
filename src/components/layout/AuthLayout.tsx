import { BrandMark } from "@/components/layout/BrandMark";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <BrandMark size={9} />
          <span className="text-lg font-semibold tracking-tight">Bottly</span>
        </Link>
        <div className="panel p-6">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>
      </div>
    </div>
  );
}
