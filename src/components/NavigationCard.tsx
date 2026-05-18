import React from 'react';
import { useNavigate } from 'react-router-dom';

interface NavigationCardProps {
  title: string;
  description: string;
  path: string;
  icon?: string;
}

const NavigationCard: React.FC<NavigationCardProps> = ({ title, description, path, icon }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(path);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-blue-400 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <div className="flex items-center gap-4">
        {icon && (
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0 relative group/desc">
          <h2 className="text-base font-semibold text-gray-900 truncate">{title}</h2>
          {/* Tooltip shown on title hover */}
          <div className="absolute bottom-full left-0 mb-2 z-50 hidden group-hover/desc:block w-72 p-3 bg-gray-800 text-white text-xs leading-relaxed rounded-lg shadow-xl pointer-events-none">
            {description}
            <div className="absolute top-full left-5 border-4 border-transparent border-t-gray-800" />
          </div>
        </div>
        <div className="flex-shrink-0 text-gray-400">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </button>
  );
};

export default NavigationCard;
