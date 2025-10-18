// src/components/ProgressBar.tsx
'use client';

import React from 'react';

interface ProgressBarProps {
  stage: string;
}

export default function ProgressBar({ stage }: ProgressBarProps) {
  return (
    <div className="w-full p-2 bg-gray-200 dark:bg-gray-700 rounded">
      {stage && <div className="text-sm text-gray-800 dark:text-gray-200">{stage}</div>}
    </div>
  );
}
