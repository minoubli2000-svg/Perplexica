'use client';

import React, { ReactNode } from 'react';
import { FaBalanceScale, FaMinus, FaWindowMaximize, FaTimes, FaSun, FaMoon } from 'react-icons/fa';
import './globals.css';

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  const [darkMode, setDarkMode] = React.useState(false);

  React.useEffect(() => {
    document.body.dataset.theme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  const windowControlsStyle = { WebkitAppRegion: 'no-drag' as const };
  const titleBarStyle = { WebkitAppRegion: 'drag' as const };

  return (
    <html lang="fr">
      <body className="relative h-screen overflow-hidden">
        {/* Barre de titre draggable */}
        <header
          className="h-10 flex items-center justify-between px-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 select-none"
          style={titleBarStyle}
        >
          {/* Logo Themis & balance */}
          <div className="flex items-center" style={windowControlsStyle}>
            <FaBalanceScale className="text-red-600 text-xl mr-2" />
            <span className="font-bold text-red-600">Thémis</span>
          </div>

          {/* Boutons utilitaires */}
          <div className="flex items-center space-x-2" style={windowControlsStyle}>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              {darkMode ? <FaSun /> : <FaMoon />}
            </button>
            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
              <input
                type="file"
                onChange={(e) => {
                  /* votre logique d'upload ici */
                }}
                className="hidden"
                id="upload-input"
              />
              <label htmlFor="upload-input" className="cursor-pointer">
                <FaWindowMaximize />
              </label>
            </button>
          </div>

          {/* Contrôles fenêtre Electron */}
          <div className="flex items-center space-x-2" style={windowControlsStyle}>
            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" onClick={() => window.electronAPI?.minimizeWindow()}>
              <FaMinus />
            </button>
            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" onClick={() => window.electronAPI?.maximizeWindow()}>
              <FaWindowMaximize />
            </button>
            <button className="p-1 hover:bg-red-500 dark:hover:bg-red-700 rounded" onClick={() => window.electronAPI?.closeWindow()}>
              <FaTimes />
            </button>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="h-[calc(100%-2.5rem)] overflow-auto bg-white dark:bg-gray-900">
          {children}
        </main>
      </body>
    </html>
  );
}

