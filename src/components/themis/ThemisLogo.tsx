// src/components/themis/ThemisLogo.tsx
import React from 'react';
import { FaBalanceScale } from 'react-icons/fa';

interface ThemisLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'default' | 'minimal';
}

const ThemisLogo: React.FC<ThemisLogoProps> = ({ 
  size = 'md', 
  className = '',
  variant = 'default' 
}) => {
  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-lg px-3 py-2',
    lg: 'text-xl px-4 py-3'
  };

  const iconSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  if (variant === 'minimal') {
    return (
      <div className={inline-flex items-center }>
        <FaBalanceScale className={	ext-red-600 mr-2 } />
        <span className={ont-bold text-red-600 select-none}>
          Thémis
        </span>
      </div>
    );
  }

  return (
    <div className={inline-flex items-center bg-white border-2 border-red-500 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200  }>
      <FaBalanceScale className={	ext-red-600 mr-2 } />
      <span className="font-bold text-red-600 select-none">Thémis</span>
      <span className="ml-2 px-1 py-0.5 bg-red-100 text-red-600 text-xs rounded font-medium">AI</span>
    </div>
  );
};

export default ThemisLogo;
