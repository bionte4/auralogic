'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { LearnShell } from '@/components/learn/learn-shell';

export default function LearnLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/learn/login' || pathname === '/learn/register') {
    return children;
  }
  return <LearnShell>{children}</LearnShell>;
}
