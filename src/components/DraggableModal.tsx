// src/components/DraggableModal.tsx
'use client';

import React, { ReactNode } from 'react';
import Draggable from 'react-draggable';
import { FaWindowMinimize, FaWindowMaximize, FaTimes } from 'react-icons/fa';

interface DraggableModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export default function DraggableModal({ title, children, onClose }: DraggableModalProps) {
  return (
    <Draggable handle=".modal-header">
      <div className="fixed bg-white dark:bg-gray-800 border border-gray-600 rounded shadow-lg w-96">
        <div className="modal-header flex justify-between items-center bg-gray-200 dark:bg-gray-700 p-2 cursor-move rounded-t">
          <span className="font-semibold">{title}</span>
          <div className="flex gap-2">
            <button><FaWindowMinimize/></button>
            <button><FaWindowMaximize/></button>
            <button onClick={onClose}><FaTimes/></button>
          </div>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </Draggable>
  );
}
