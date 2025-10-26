// types/electron.d.ts (ou src/types/electron.d.ts – étend Window pour preload API)
declare global {
  interface Window {
    electronAPI: {
      minimizeWindow?: () => Promise<boolean>;
      maximizeWindow?: () => Promise<boolean>;
      closeWindow?: () => Promise<boolean>;
      onWindowMaximized?: (cb: (...args: any[]) => void) => void;
      onWindowUnmaximized?: (cb: (...args: any[]) => void) => void;
      removeAllListeners?: (evt: string) => void;
      selectFile?: () => Promise<string | null>;
      getVersion?: () => Promise<string>;
      getPlatform?: () => Promise<string>;
    };
  }
}
export {};

