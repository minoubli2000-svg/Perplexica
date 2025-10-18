'use client';
import React from 'react';
import { FaBalanceScale, FaMinus, FaWindowMaximize, FaTimes } from 'react-icons/fa';

declare global {
  interface Window {
    electronAPI?: {
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
    };
  }
}

export default function TitleBar() {
  const handleMinimize = () => {
    if (window.electronAPI) window.electronAPI.minimizeWindow();
  };

  const handleMaximize = () => {
    if (window.electronAPI) window.electronAPI.maximizeWindow();
  };

  const handleClose = () => {
    if (window.electronAPI) window.electronAPI.closeWindow();
  };

  return (
    <div className="titlebar">
      <div className="left">
        <div className="themis-logo no-drag">
          <FaBalanceScale className="icon" />
          <span className="ver">AI</span>
        </div>
        <span className="brand no-drag">Thémis</span>
      </div>

      <div className="spacer"></div>

      <div className="controls no-drag">
        <button className="btn" onClick={handleMinimize}>
          <FaMinus />
        </button>
        <button className="btn" onClick={handleMaximize}>
          <FaWindowMaximize />
        </button>
        <button className="btn close" onClick={handleClose}>
          <FaTimes />
        </button>
      </div>
    </div>
  );
}
