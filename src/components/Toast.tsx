// src/components/Toast.tsx
'use client';
import React from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  if (!message) return null;
  return (
    <div
      className={`fixed bottom-4 right-4 p-3 rounded shadow ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      }`}
      onClick={onClose}
    >
      {message}
    </div>
  );
}
