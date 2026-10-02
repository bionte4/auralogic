'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { InstructorShell } from '@/components/instructor/instructor-shell';

export default function InstructorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/instructor/login') {
    return children;
  }
  return <InstructorShell>{children}</InstructorShell>;
}
