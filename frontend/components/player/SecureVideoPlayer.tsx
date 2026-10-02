'use client';

import { useEffect, useRef } from 'react';
import 'video.js/dist/video-js.css';
import {
  isDownloadShortcut,
  isHlsManifest,
  preventPlayerEvent,
  type WatermarkIdentity,
} from './playback-guard';

export interface SecurePlayerControls {
  togglePlay: () => void;
  seekBy: (seconds: number) => void;
}

export interface SecureVideoPlayerProps {
  manifestUrl: string;
  watermark: WatermarkIdentity;
  onControls?: (controls: SecurePlayerControls | null) => void;
}

export function SecureVideoPlayer({ manifestUrl, watermark, onControls }: SecureVideoPlayerProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onControlsRef = useRef(onControls);
  onControlsRef.current = onControls;
  const canPlay = isHlsManifest(manifestUrl);

  useEffect(() => {
    const root = shellRef.current;
    if (!root) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isDownloadShortcut(event)) {
        return;
      }
      if (event.target instanceof Node && root.contains(event.target)) {
        preventPlayerEvent(event);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !canPlay) {
      return undefined;
    }

    let disposed = false;
    let player: VideoPlayer | undefined;

    void import('video.js').then(({ default: videojs }) => {
      if (disposed || !videoRef.current) {
        return;
      }
      const created = videojs(videoRef.current, {
        controls: true,
        preload: 'metadata',
        fill: true,
        sources: [{ src: manifestUrl, type: 'application/x-mpegURL' }],
        html5: {
          vhs: { overrideNative: true },
        },
        userActions: {
          doubleClick: false,
        },
      });
      player = created;
      player.ready(() => {
        const media = player?.el().querySelector('video');
        media?.setAttribute('controlsList', 'nodownload');
        media?.setAttribute('disablePictureInPicture', 'true');
        player?.el().addEventListener('contextmenu', preventPlayerEvent);
        if (!player) {
          return;
        }
        const readyPlayer = player;
        onControlsRef.current?.({
          togglePlay() {
            if (readyPlayer.isDisposed()) {
              return;
            }
            if (readyPlayer.paused()) {
              void readyPlayer.play();
            } else {
              readyPlayer.pause();
            }
          },
          seekBy(seconds: number) {
            if (readyPlayer.isDisposed()) {
              return;
            }
            const duration = readyPlayer.duration() ?? 0;
            const current = readyPlayer.currentTime() ?? 0;
            const ceiling = Number.isFinite(duration) && duration > 0 ? duration : current + Math.max(seconds, 0);
            readyPlayer.currentTime(Math.min(Math.max(0, current + seconds), ceiling));
          },
        });
      });
    });

    return () => {
      disposed = true;
      onControlsRef.current?.(null);
      player?.el().removeEventListener('contextmenu', preventPlayerEvent);
      if (player && !player.isDisposed()) {
        player.dispose();
      }
    };
  }, [canPlay, manifestUrl]);

  if (!canPlay) {
    return (
      <p role="alert" className="rounded-md border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-100">
        This player only streams encrypted HLS manifests.
      </p>
    );
  }

  return (
    <div
      ref={shellRef}
      className="relative aspect-video w-full touch-manipulation overflow-hidden rounded-lg bg-black"
      data-testid="secure-video-player"
      onContextMenu={preventPlayerEvent}
      onDragStart={preventPlayerEvent}
    >
      <video
        ref={videoRef}
        className="video-js vjs-big-play-centered h-full w-full"
        controls
        controlsList="nodownload"
        playsInline
        disablePictureInPicture
        onContextMenu={preventPlayerEvent}
      />
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
        <p data-testid="video-watermark" className="watermark-drift">
          {watermark.email} · {watermark.userId}
        </p>
      </div>
    </div>
  );
}

interface VideoPlayer {
  ready: (callback: () => void) => void;
  el: () => Element;
  isDisposed: () => boolean;
  dispose: () => void;
  paused: () => boolean;
  play: () => Promise<void> | undefined;
  pause: () => void;
  currentTime: (seconds?: number) => number | undefined;
  duration: () => number | undefined;
}
