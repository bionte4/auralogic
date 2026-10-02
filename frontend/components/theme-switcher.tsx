'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { THEMES, type ThemeId, isThemeId } from '@/lib/themes';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const selected: ThemeId = ready && theme && isThemeId(theme) ? theme : 'dark';

  return (
    <label className="flex items-center">
      <span className="sr-only">Color theme</span>
      <select
        aria-label="Color theme"
        className="h-11 rounded-md border border-border bg-background px-2 text-sm text-foreground"
        value={selected}
        onChange={(event) => {
          if (isThemeId(event.target.value)) {
            setTheme(event.target.value);
          }
        }}
      >
        {THEMES.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
