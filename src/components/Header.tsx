import { Link, useLocation } from 'react-router-dom';
import { BRANDING } from '../utils';

export function Header() {
  const location = useLocation();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <Link 
          to="/" 
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">{BRANDING.logoAbbreviation}</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{BRANDING.productName}</h1>
            <p className="text-xs text-gray-600">{BRANDING.tagline}</p>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {[
            { to: '/',          label: 'Home'       },
            { to: '/how-to-use', label: 'How to Use' },
            { to: '/about',      label: 'About'      },
            { to: '/config',     label: 'Config'     },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                location.pathname === to
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
