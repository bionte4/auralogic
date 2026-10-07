import type { TrackIconKey } from './track.icons';

export interface DefaultLearningTrack {
  slug: string;
  nameId: string;
  nameEn: string;
  blurbId: string;
  blurbEn: string;
  iconKey: TrackIconKey;
  sortOrder: number;
}

export const DEFAULT_LEARNING_TRACKS: DefaultLearningTrack[] = [
  {
    slug: 'NETWORK',
    nameId: 'Network',
    nameEn: 'Network',
    blurbId: 'Pengalamatan, subnet, dan jalur paket.',
    blurbEn: 'Addressing, subnets, and how packets find a path.',
    iconKey: 'waypoints',
    sortOrder: 10,
  },
  {
    slug: 'CYBERSECURITY',
    nameId: 'Cybersecurity',
    nameEn: 'Cybersecurity',
    blurbId: 'Risiko, baseline, dan rekomendasi hardening.',
    blurbEn: 'Risk, baselines, and hardening recommendations.',
    iconKey: 'shield',
    sortOrder: 20,
  },
  {
    slug: 'DATA_SCIENCE',
    nameId: 'Data science',
    nameEn: 'Data science',
    blurbId: 'SQL, pembersihan data, dan metrik.',
    blurbEn: 'SQL, cleaning data, and reading metrics.',
    iconKey: 'chart',
    sortOrder: 30,
  },
  {
    slug: 'AI',
    nameId: 'AI',
    nameEn: 'AI',
    blurbId: 'Batas model dan keputusan yang tetap diawasi.',
    blurbEn: 'Model limits and decisions that stay under review.',
    iconKey: 'sparkles',
    sortOrder: 40,
  },
  {
    slug: 'DATACENTER',
    nameId: 'Datacenter',
    nameEn: 'Datacenter',
    blurbId: 'Fasilitas, daya, pendinginan, dan operasi ruang server.',
    blurbEn: 'Facilities, power, cooling, and running a server room.',
    iconKey: 'server',
    sortOrder: 50,
  },
];
