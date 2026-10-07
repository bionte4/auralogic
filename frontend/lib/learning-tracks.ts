import { BarChart3, Cloud, Cpu, Database, HardDrive, Network, Server, ShieldCheck, Sparkles, Waypoints, type LucideIcon } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export interface LearningTrackRecord {
  id: string;
  slug: string;
  nameId: string;
  nameEn: string;
  blurbId: string;
  blurbEn: string;
  iconKey: string;
  sortOrder: number;
  active: boolean;
}

export const TRACK_ICON_OPTIONS = [
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

export type TrackIconKey = (typeof TRACK_ICON_OPTIONS)[number];

const ICONS: Record<string, LucideIcon> = {
  waypoints: Waypoints,
  shield: ShieldCheck,
  chart: BarChart3,
  sparkles: Sparkles,
  server: Server,
  cpu: Cpu,
  database: Database,
  cloud: Cloud,
  'hard-drive': HardDrive,
  network: Network,
};

export function trackIcon(iconKey: string): LucideIcon {
  return ICONS[iconKey] ?? Waypoints;
}

export function trackName(track: LearningTrackRecord, locale: 'ID' | 'EN'): string {
  return locale === 'EN' ? track.nameEn : track.nameId;
}

/** Fallback when only the course slug is known (catalog cards, studio chrome). */
export function trackSlugLabel(slug: string, labels?: Record<string, string>): string {
  return labels?.[slug] ?? slug.replaceAll('_', ' ');
}

export function trackBlurb(track: LearningTrackRecord, locale: 'ID' | 'EN'): string {
  return locale === 'EN' ? track.blurbEn : track.blurbId;
}

export function listPublicTracks(): Promise<LearningTrackRecord[]> {
  return apiRequest<LearningTrackRecord[]>('/tracks');
}

export function listAdminTracks(): Promise<LearningTrackRecord[]> {
  return apiRequest<LearningTrackRecord[]>('/admin/tracks');
}

export const TRACK_SLUG_PATTERN = /^[A-Z][A-Z0-9_]{0,31}$/;

export function isTrackSlug(value: string): boolean {
  return TRACK_SLUG_PATTERN.test(value);
}
