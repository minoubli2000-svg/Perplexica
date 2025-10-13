// src/components/RightPanel.tsx
'use client';

import React from 'react';

type Props = {
  chatHistory: { from: string; text: string }[];
  onCopy: (text: string) => void;
  onClear: () => void;
};

export default function RightPanel({ chatHistory, onCopy, onClear }: Props) {
  return (
    <div className="p-2">
      <div className="flex justify-between mb-2">
        <button onClick={onClear} className="text-sm text-red-500">Clear</button>
      </div>
      {chatHistory.map((m, i) => (
        <div key={i} className="mb-1 flex justify-between">
          <span>{m.text}</span>
          <button onClick={() => onCopy(m.text)} className="text-blue-500 text-sm">Copy</button>
        </div>
      ))}
    </div>
  );
}
