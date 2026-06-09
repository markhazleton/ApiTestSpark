import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BRANDING } from '../utils';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/config', label: 'Config' },
  { to: '/how-to-use', label: 'Help' },
  { to: '/about', label: 'About' },
];

export function Header() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = NAV_ITEMS.map(({ to, label }) => (
    <Link
      key={to}
      to={to}
      onClick={() => setMenuOpen(false)}
      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        location.pathname === to
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label}
    </Link>
  ));

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-3">
        <Link 
          to="/" 
          onClick={() => setMenuOpen(false)}
          className="min-w-0 flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">{BRANDING.logoAbbreviation}</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">{BRANDING.productName}</h1>
            <p className="hidden 2xl:block text-xs text-gray-600 truncate">{BRANDING.tagline}</p>
          </div>
        </Link>

        <nav className="hidden xl:flex items-center gap-1 shrink-0">
          {navLinks}
        </nav>

        <button
          type="button"
          className="xl:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">Toggle navigation menu</span>
          <span className="flex flex-col gap-1">
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
          </span>
        </button>
      </div>
      {menuOpen && (
        <nav className="xl:hidden mt-3 grid gap-1 border-t border-gray-100 pt-3">
          {navLinks}
        </nav>
      )}
    </header>
  );
}
