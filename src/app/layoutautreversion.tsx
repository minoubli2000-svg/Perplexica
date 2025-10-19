'use client';
import React, { ReactNode } from 'react';
import { FaBalanceScale, FaMinus, FaWindowMaximize, FaTimes } from 'react-icons/fa';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen w-full overflow-hidden bg-[#191F38]">
        <main className="bg-[#191F38] w-full h-full min-h-screen">
          {/* Header principal : logo, texte, boutons natifs Electron */}
          <div
            className="flex items-center justify-between px-12 pt-10"
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
            {/* Conteneur boutons (no-drag) */}
            <div className="flex items-center space-x-6" style={{ WebkitAppRegion: 'no-drag' }}>
              {/* Minimize (protégé du drag) */}
              <button
                className="w-10 h-10 flex items-center justify-center rounded hover:bg-blue-900 transition"
                style={{ 
                  WebkitAppRegion: 'no-drag', 
                  pointerEvents: 'auto'  // Clics prioritaires
                }}
                onClick={() => window.electronAPI?.minimizeWindow()}
                title="Réduire"
              >
                <FaMinus size={32} />
              </button>
              {/* Agrandir (protégé du drag) */}
              <button
                className="w-10 h-10 flex items-center justify-center rounded hover:bg-blue-900 transition"
                style={{ 
                  WebkitAppRegion: 'no-drag', 
                  pointerEvents: 'auto'  // Clics prioritaires
                }}
                onClick={() => window.electronAPI?.maximizeWindow()}
                title="Agrandir"
              >
                <FaWindowMaximize size={32} />
              </button>
              {/* Fermer (protégé du drag) */}
              <button
                className="w-10 h-10 flex items-center justify-center rounded hover:bg-red-600 transition"
                style={{ 
                  WebkitAppRegion: 'no-drag', 
                  pointerEvents: 'auto'  // Clics prioritaires
                }}
                onClick={() => window.electronAPI?.closeWindow()}
                title="Fermer"
              >
                <FaTimes size={32} />
              </button>
            </div>
          </div>

          {/* Barre Themis - tous tes boutons/actions sont protégés du drag */}
          <div className="themis-toolbar" style={{ WebkitAppRegion: 'no-drag' }}>
            {/* Ici tu mets tous tes boutons d'action Themis : 
                Profil, Moteur, Modèle, Clair/Obscur, etc. */}
            {/* ...Boutons et menus... */}
          </div>

          {/* Le reste de l'application */}
          {children}
        </main>
      </body>
    </html>
  );
}
