"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface WeeklyProgressLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: "button" | "link";
}

export default function WeeklyProgressLink({ href, children, className = "", variant = "link" }: WeeklyProgressLinkProps) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Clear loading state when pathname changes
    setLoading(false);
  }, [pathname]);

  const baseClasses = variant === "button" 
    ? "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
    : "";

  const defaultLinkClasses = variant === "link" 
    ? "inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
    : "";

  return (
    <Link
      href={href}
      onClick={() => setLoading(true)}
      className={`${baseClasses} ${defaultLinkClasses} ${className} ${loading ? "opacity-75 cursor-wait pointer-events-none" : ""}`}
    >
      {children}
      {loading && (
        <svg className="w-4 h-4 animate-spin ml-1" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
    </Link>
  );
}

