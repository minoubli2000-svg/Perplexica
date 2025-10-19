interface DraggableModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  headerControls?: React.ReactNode;
  size?: 'full' | 'lg';
}
import React, { useRef } from 'react';
import Draggable from 'react-draggable';

export default function DraggableModal({
  title,
  children,
  onClose,
  headerControls,
  size = 'lg'
}: DraggableModalProps) {
  const nodeRef = useRef(null);

  const modalSize = size === 'full'
    ? 'top-12 left-1/2 -translate-x-1/2 w-[96vw] max-w-none h-[90vh]'
    : 'top-32 left-1/2 -translate-x-1/2 max-w-2xl w-full';

  return (
    <Draggable nodeRef={nodeRef} handle=".modal-title">
      <div
        ref={nodeRef}
        className={`fixed z-50 bg-white shadow-lg rounded-lg ${modalSize}`}
        style={size === 'full' ? { height: '90vh' } : {}}
      >
        <div className="modal-title flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg cursor-move">
          <span className="font-bold">{title}</span>
          {headerControls && <div className="flex space-x-2">{headerControls}</div>}
        </div>
        <div className="p-4">{children}</div>
      </div>
    </Draggable>
  );
}

