"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthSection } from "@/components/auth/auth-section";

export function Header() {
  return (
    <header className="border-b bg-card sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold">Linear Roadmap</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/settings" className="hover:text-primary focus:outline-none" aria-label="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zm7.94-2.34a1 1 0 0 0 .26-1.09l-1-1.73a1 1 0 0 1 0-.94l1-1.73a1 1 0 0 0-.26-1.09l-2-2a1 1 0 0 0-1.09-.26l-1.73 1a1 1 0 0 1-.94 0l-1.73-1a1 1 0 0 0-1.09.26l-2 2a1 1 0 0 0-.26 1.09l1 1.73a1 1 0 0 1 0 .94l-1 1.73a1 1 0 0 0 .26 1.09l2 2a1 1 0 0 0 1.09.26l1.73-1a1 1 0 0 1 .94 0l1.73 1a1 1 0 0 0 1.09-.26l2-2z" />
            </svg>
          </Link>
          <AuthSection />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
} 