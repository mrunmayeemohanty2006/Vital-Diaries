import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { SITE_CONFIG } from './config';
import { Menu, X, ArrowRight } from 'lucide-react';

interface NavbarProps {
  onNavigateAuth: (route: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigateAuth }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        isScrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#home"
            className="flex items-center focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-4 rounded-md"
            aria-label="Vital Diaries Homepage"
          >
            <Logo />
          </a>

          {/* Zone 2: Navigation Links (Desktop) */}
          <nav
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
            aria-label="Main Navigation"
          >
            {SITE_CONFIG.navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="hover:text-emerald-700 transition-colors py-1 focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2 rounded-sm"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Zone 3: Primary Actions (Sign In is ALWAYS visible in the top right on all screen sizes) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => onNavigateAuth(SITE_CONFIG.routes.login)}
              className="inline-flex items-center justify-center px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-950 bg-slate-100/70 sm:bg-transparent hover:bg-slate-200/60 sm:hover:bg-slate-100/80 border border-slate-200/90 sm:border-transparent transition-colors whitespace-nowrap cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              Sign In
            </button>

            <button
              onClick={() => onNavigateAuth(SITE_CONFIG.routes.signup)}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors rounded-lg shadow-xs whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 opacity-80" />
            </button>

            {/* Mobile Navigation Toggle for Page Links */}
            <div className="flex md:hidden items-center">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-600 cursor-pointer"
                aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3 shadow-lg">
          <nav className="flex flex-col space-y-1">
            {SITE_CONFIG.navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/60 rounded-md transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigateAuth(SITE_CONFIG.routes.login);
              }}
              className="w-full py-2.5 text-center text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigateAuth(SITE_CONFIG.routes.signup);
              }}
              className="w-full py-2.5 text-center text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
