// types/electron.d.ts (ou src/types/electron.d.ts – étend Window pour preload API)
declare global {
  interface Window {
    electronAPI: {
      // Window controls (invoke main.js handlers : retourne Promise<boolean> pour success)
      minimizeWindow: () => Promise<boolean>;
      maximizeWindow: () => Promise<boolean>;
      closeWindow: () => Promise<boolean>;

      // Écouteurs événements (de main.js : maximize/unmaximize state)
      onWindowMaximized: (callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => void;
      onWindowUnmaximized: (callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => void;

      // Bonus (file dialog, etc.)
      selectFile: () => Promise<string | null>;
      getVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
    };
  }
}

// Pour éviter erreurs global en TS strict (si tsconfig.json "noImplicitAny": true)
export {};  // Vide pour module augmentation
