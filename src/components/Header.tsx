import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BRANDING } from '../utils';
import makeBoldLogo from '../assets/brand/make-bold-solutions-logo.svg';
import makeBoldMark from '../assets/brand/make-bold-mark.svg';

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
          ? 'bg-[#982407] text-white'
          : 'text-stone-700 hover:bg-[#f7e6e1] hover:text-[#982407]'
      }`}
    >
      {label}
    </Link>
  ));

  return (
    <header className="bg-white/95 backdrop-blur border-b border-[#ded8d4] px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-3">
        <Link 
          to="/" 
          onClick={() => setMenuOpen(false)}
          className="min-w-0 flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-md bg-[#fbfaf8] border border-[#ded8d4] flex items-center justify-center shrink-0 shadow-sm">
            <img src={makeBoldMark} alt="" aria-hidden="true" className="w-7 h-7 object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black text-[#040605] truncate">{BRANDING.productName}</h1>
            <p className="hidden 2xl:block text-xs text-[#787878] truncate">{BRANDING.productFamily}</p>
          </div>
        </Link>

        <div className="hidden xl:flex items-center gap-4 shrink-0">
          <nav className="flex items-center gap-1">
            {navLinks}
          </nav>
          <a href={BRANDING.companyUrl} aria-label={BRANDING.companyName} className="hidden 2xl:block">
            <img src={makeBoldLogo} alt={BRANDING.companyName} className="brand-wordmark" />
          </a>
        </div>

        <button
          type="button"
          className="xl:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#ded8d4] text-[#040605] hover:bg-[#f7e6e1]"
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
        <nav className="xl:hidden mt-3 grid gap-1 border-t border-[#ded8d4] pt-3">
          {navLinks}
        </nav>
      )}
    </header>
  );
}
