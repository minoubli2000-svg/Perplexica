// src/components/Modal.tsx
'use client';

import React, { ReactNode, useState } from 'react';
import { FaWindowMinimize, FaWindowMaximize, FaTimes } from 'react-icons/fa';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export default function Modal({ title, children, onClose }: ModalProps) {
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);

  return (
    <div
      className={`fixed bg-white dark:bg-gray-800 border border-gray-600 rounded shadow-lg
        ${maximized ? 'inset-0 m-0' : 'w-96 m-4'}`}
    >
      <div className="flex justify-between items-center bg-gray-200 dark:bg-gray-700 p-2 cursor-move rounded-t">
        <span className="font-semibold">{title}</span>
        <div className="flex gap-2">
          <button onClick={() => setMinimized((v) => !v)}>
            <FaWindowMinimize />
          </button>
          <button onClick={() => setMaximized((v) => !v)}>
            <FaWindowMaximize />
          </button>
          <button onClick={onClose}>
            <FaTimes />
          </button>
        </div>
      </div>
      {!minimized && <div className="p-4 overflow-auto">{children}</div>}
    </div>
  );
}
