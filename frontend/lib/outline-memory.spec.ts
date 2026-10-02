import { parseCollapsedModuleIds, parseScrollTop, toggleCollapsed } from './outline-memory';

describe('outline memory', () => {
  it('keeps a saved list of collapsed modules and ignores invalid storage', () => {
    expect(parseCollapsedModuleIds('["level-2"]')).toEqual(['level-2']);
    expect(parseCollapsedModuleIds('{"level":1}')).toEqual([]);
    expect(parseCollapsedModuleIds('not-json')).toEqual([]);
    expect(toggleCollapsed(['level-2'], 'level-1')).toEqual(['level-2', 'level-1']);
    expect(toggleCollapsed(['level-2', 'level-1'], 'level-1')).toEqual(['level-2']);
  });

  it('restores a non-negative scroll offset', () => {
    expect(parseScrollTop('240')).toBe(240);
    expect(parseScrollTop('-4')).toBe(0);
    expect(parseScrollTop(null)).toBe(0);
  });
});