export const TRACK_ICON_KEYS = [
  'waypoints',
  'shield',
  'chart',
  'sparkles',
  'server',
  'cpu',
  'database',
  'cloud',
  'hard-drive',
  'network',
] as const;

export type TrackIconKey = (typeof TRACK_ICON_KEYS)[number];

export function isTrackIconKey(value: string): value is TrackIconKey {
  return (TRACK_ICON_KEYS as readonly string[]).includes(value);
}
