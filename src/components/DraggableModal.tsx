'use client';
import React, { ReactNode, useRef } from 'react';
import Draggable from 'react-draggable';

interface DraggableModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export default function DraggableModal({ title, children, onClose }: DraggableModalProps) {
  const nodeRef = useRef<HTMLDivElement>(null);

  return (
    <Draggable handle=".modal-header" nodeRef={nodeRef}>
      <div
        ref={nodeRef}
        className="fixed bg-white dark:bg-gray-800 border border-gray-600 rounded shadow-lg w-96"
      >
        <div className="modal-header flex justify-between items-center bg-gray-200 dark:bg-gray-700 p-2 cursor-move rounded-t">
          <span className="font-semibold">{title}</span>
          <button onClick={onClose} className="text-gray-700 dark:text-gray-300">
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </Draggable>
  );
}
