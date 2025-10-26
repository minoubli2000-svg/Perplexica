'use client';
import React, { ReactNode, useState, useEffect } from 'react';
import { FaBalanceScale, FaMinus, FaWindowMaximize, FaWindowRestore, FaTimes } from 'react-icons/fa';
import './globals.css';
/// <reference path="../../types/electron.d.ts" />


export default function RootLayout({ children }: { children: ReactNode }) {
  const [isMaximized, setIsMaximized] = useState(false);

  // Sync state maximize via IPC events (preload/main)
  useEffect(() => {
    const handleMaximized = () => setIsMaximized(true);
    const handleUnmaximized = () => setIsMaximized(false);
    if (window.electronAPI) {
      window.electronAPI.onWindowMaximized?.(handleMaximized);
      window.electronAPI.onWindowUnmaximized?.(handleUnmaximized);
      return () => {
        window.electronAPI.removeAllListeners?.('window-maximized');
        window.electronAPI.removeAllListeners?.('window-unmaximized');
      };
    }
  }, []);

  const minimizeWindow = () => window.electronAPI?.minimizeWindow?.();
  const toggleMaximizeWindow = () => window.electronAPI?.maximizeWindow?.();
  const closeWindow = () => window.electronAPI?.closeWindow?.();

  return (
    <html lang="fr">
      <body className="min-h-screen w-full overflow-hidden bg-[#191F38]">
        {/* Boutons controls fixed top-right extrême (barre front Electron, no-drag) */}
        <div 
          className="fixed top-0 right-0 z-[1000] flex gap-0 p-1 bg-[#191F38]/80 backdrop-blur-sm" 
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <button
            className="w-9 h-9 flex items-center justify-center rounded-l hover:bg-blue-900/50 transition text-white"
            onClick={minimizeWindow}
            title="Réduire"
          >
            <FaMinus size={18} />
          </button>
          <button
            className="w-9 h-9 flex items-center justify-center hover:bg-blue-900/50 transition text-white"
            onClick={toggleMaximizeWindow}
            title={isMaximized ? "Restaurer" : "Agrandir"}
          >
            {isMaximized ? <FaWindowRestore size={18} /> : <FaWindowMaximize size={18} />}
          </button>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-r hover:bg-red-600/80 transition text-white"
            onClick={closeWindow}
            title="Fermer"
          >
            <FaTimes size={18} />
          </button>
        </div>

        <main className="bg-[#191F38] w-full h-full min-h-screen pt-12"> {/* pt-12 pour espace boutons fixed */}
          {/* Header : drag barre front React (logo gauche seulement) */}
          <div
            className="flex items-center justify-start px-12 pt-4" // pt-4 ajusté, justify-start sans boutons
            style={{ background: 'transparent', WebkitAppRegion: 'drag' }}
          >
            <div className="flex items-center">
              <FaBalanceScale
                size={80}
                style={{
                  color: 'white',
                  filter: 'drop-shadow(0 0 12px #C00) drop-shadow(0 0 2px #C00)',
                }}
              />
              <span
                className="font-bold ml-6 text-7xl"
                style={{
                  color: 'white',
                  textShadow: '6px 0 #c00, 0 6px #c00, -6px 0 #c00, 0 -6px #c00',
                }}
              >
                Themis
              </span>
            </div>
          </div>

          {/* Barre tool Themis inchangée (sous header, no-drag) */}
          <div className="themis-toolbar px-12" style={{ WebkitAppRegion: 'no-drag' }}>
            {/* Ici tu mets tous tes boutons d'action Themis : Profil, Moteur, Modèle, Clair/Obscur, etc. */}
            {/* ...Boutons et menus... */}
          </div>

          {/* Contenu principal inchangé */}
          <div className="px-12 pb-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}



