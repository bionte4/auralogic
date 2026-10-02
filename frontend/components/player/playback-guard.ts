export interface WatermarkIdentity {
  userId: string;
  email: string;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
}

export interface BlockableEvent {
  preventDefault: () => void;
  stopPropagation: () => void;
}

export function isHlsManifest(value: string): boolean {
  try {
    const url = new URL(value);
    const path = url.pathname.toLowerCase();
    return url.protocol === 'https:' && path.endsWith('.m3u8') && !path.includes('.mp4');
  } catch {
    return false;
  }
}

export function isDownloadShortcut(event: KeyboardShortcut): boolean {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's';
}

export function preventPlayerEvent(event: BlockableEvent): void {
  event.preventDefault();
  event.stopPropagation();
}
