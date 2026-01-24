"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingLink, setLoadingLink] = useState<string | null>(null);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleLinkClick = (href: string) => {
    setLoadingLink(href);
    closeMobileMenu();
  };

  // Clear loading state when pathname changes
  useEffect(() => {
    if (loadingLink) {
      setLoadingLink(null);
    }
  }, [pathname]);

  const NavLink = ({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) => {
    const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));
    const isLoading = loadingLink === href;

    return (
      <Link
        href={href}
        onClick={() => handleLinkClick(href)}
        className={`${className} inline-flex items-center gap-2 ${
          isActive
            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
            : "text-gray-700 hover:bg-gray-100"
        } ${isLoading ? "opacity-75 cursor-wait" : ""}`}
      >
        <span>{children}</span>
        {isLoading && (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </Link>
    );
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group" onClick={closeMobileMenu}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-200">
              <span className="text-white font-bold text-base sm:text-lg">S</span>
            </div>
            <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Softech Inc
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <NavLink
              href="/"
              className="px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm"
            >
              Home
            </NavLink>
            <NavLink
              href="/projects"
              className="px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm"
            >
              Projects
            </NavLink>
            <NavLink
              href="/reminders"
              className="px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm"
            >
              Reminders
            </NavLink>
            
            {session && (
              <div className="ml-4 flex items-center space-x-3 border-l border-gray-200 pl-4">
                <div className="hidden lg:block text-sm text-gray-600">
                  <div className="font-medium text-gray-900 truncate max-w-[150px]">{session.user?.email}</div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            {session && (
              <div className="text-xs text-gray-600 truncate max-w-[100px] hidden sm:block">
                {session.user?.email}
              </div>
            )}
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                // Close icon (X)
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                // Hamburger icon
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 animate-in slide-in-from-top">
            <div className="flex flex-col space-y-2">
              <NavLink
                href="/"
                className="px-4 py-3 rounded-lg font-medium transition-all duration-200"
              >
                Home
              </NavLink>
              <NavLink
                href="/projects"
                className="px-4 py-3 rounded-lg font-medium transition-all duration-200"
              >
                Projects
              </NavLink>
              <NavLink
                href="/reminders"
                className="px-4 py-3 rounded-lg font-medium transition-all duration-200"
              >
                Reminders
              </NavLink>
              
              {session && (
                <div className="border-t border-gray-200 pt-4 mt-2">
                  <div className="px-4 py-2 text-sm text-gray-600 mb-2">
                    <div className="font-medium text-gray-900 truncate">{session.user?.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      signOut({ callbackUrl: "/login" });
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
