export type PlayerKeyAction =
  | { type: 'toggle-play' }
  | { type: 'seek'; delta: number }
  | { type: 'shift-lesson'; direction: -1 | 1 };

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A']);

export function playerKeyAction(input: {
  key: string;
  desktop: boolean;
  targetTag: string;
  editable: boolean;
}): PlayerKeyAction | null {
  if (!input.desktop || input.editable || TYPING_TAGS.has(input.targetTag)) {
    return null;
  }
  if (input.key === ' ' || input.key === 'Spacebar') {
    return { type: 'toggle-play' };
  }
  if (input.key === 'ArrowLeft') {
    return { type: 'seek', delta: -5 };
  }
  if (input.key === 'ArrowRight') {
    return { type: 'seek', delta: 5 };
  }
  if (input.key === 'ArrowUp') {
    return { type: 'shift-lesson', direction: -1 };
  }
  if (input.key === 'ArrowDown') {
    return { type: 'shift-lesson', direction: 1 };
  }
  return null;
}
