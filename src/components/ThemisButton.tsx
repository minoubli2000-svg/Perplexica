'use client';

import React from 'react';

type Props = {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
};

export default function ThemisButton({
  icon,
  label,
  onClick,
  variant = 'primary',
  className = '',
}: Props) {
  const base = 'inline-flex items-center gap-2 px-3 py-1 rounded font-semibold';
  const styles =
    variant === 'primary'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'bg-gray-200 text-gray-800 hover:bg-gray-300';
  return (
    <button onClick={onClick} className={`${base} ${styles} ${className}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
