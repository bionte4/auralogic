import type { LearningPhase } from '@/lib/courses';

export const LEARNING_PHASES: ReadonlyArray<{ value: LearningPhase; label: string }> = [
  { value: 'A', label: 'Fase A · grades 1–2' },
  { value: 'B', label: 'Fase B · grades 3–4' },
  { value: 'C', label: 'Fase C · grades 5–6' },
  { value: 'D', label: 'Fase D · grades 7–9' },
  { value: 'E', label: 'Fase E · grade 10' },
  { value: 'F', label: 'Fase F · grades 11–12' },
];

export function phaseLabel(phase: LearningPhase | null): string | null {
  return LEARNING_PHASES.find((item) => item.value === phase)?.label ?? null;
}
