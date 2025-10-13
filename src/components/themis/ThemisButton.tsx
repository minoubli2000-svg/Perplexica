// src/components/themis/ThemisButton.tsx
'use client';

import React from 'react';

type Props = {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

export default function ThemisButton({
  icon,
  label,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  size = 'md'
}: Props) {
  const baseClasses = 'inline-flex items-center gap-2 rounded font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 select-none cursor-pointer';
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-3 text-lg'
  };

  const variantClasses = {
    primary: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border border-red-600 shadow-md hover:shadow-lg',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300 border border-gray-300 shadow-sm hover:shadow-md',
    danger: 'bg-red-100 text-red-700 hover:bg-red-200 active:bg-red-300 border border-red-300 shadow-sm hover:shadow-md'
  };

  const disabledClasses = 'opacity-50 cursor-not-allowed pointer-events-none';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={${baseClasses}    }
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
