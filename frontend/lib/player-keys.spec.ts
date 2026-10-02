import { playerKeyAction } from './player-keys';

describe('desktop player keys', () => {
  const desktop = { desktop: true, targetTag: 'DIV', editable: false };

  it('maps space and arrows only on a desktop surface outside form fields', () => {
    expect(playerKeyAction({ ...desktop, key: ' ' })).toEqual({ type: 'toggle-play' });
    expect(playerKeyAction({ ...desktop, key: 'ArrowRight' })).toEqual({ type: 'seek', delta: 5 });
    expect(playerKeyAction({ ...desktop, key: 'ArrowUp' })).toEqual({ type: 'shift-lesson', direction: -1 });
    expect(playerKeyAction({ ...desktop, key: 'ArrowLeft', desktop: false })).toBeNull();
    expect(playerKeyAction({ ...desktop, key: ' ', targetTag: 'TEXTAREA' })).toBeNull();
    expect(playerKeyAction({ ...desktop, key: 'ArrowDown', editable: true })).toBeNull();
  });
});
