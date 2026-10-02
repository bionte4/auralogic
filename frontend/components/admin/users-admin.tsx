'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, apiRequest } from '@/lib/api';
import type { CourseSummary } from '@/lib/courses';

type AppRole = 'STUDENT' | 'INSTRUCTOR' | 'SUPER_ADMIN';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  active: boolean;
  createdAt: string;
}

interface AdminUserPage {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

interface BatchResult {
  courseId: string;
  enrolled: Array<{ email: string; name: string; createdAccount: boolean; temporaryPassword: string | null }>;
  skipped: Array<{ email: string; reason: string }>;
}

const ROLES: AppRole[] = ['STUDENT', 'INSTRUCTOR', 'SUPER_ADMIN'];

export function UsersAdmin() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState({ q: '', role: '' });
  const [data, setData] = useState<AdminUserPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (applied.q.trim()) {
      params.set('q', applied.q.trim());
    }
    if (applied.role) {
      params.set('role', applied.role);
    }
    let active = true;
    setData(null);
    void apiRequest<AdminUserPage>(`/admin/users?${params.toString()}`)
      .then((next) => {
        if (active) {
          setData(next);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : 'Could not load users.');
        }
      });
    return () => {
      active = false;
    };
  }, [applied, page]);

  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  async function patchUser(user: AdminUser, body: { role?: AppRole; active?: boolean }): Promise<void> {
    setBusyId(user.id);
    setError(null);
    try {
      const updated = await apiRequest<AdminUser>(`/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setData((current) =>
        current
          ? { ...current, items: current.items.map((item) => (item.id === updated.id ? updated : item)) }
          : current,
      );
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not update the user.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Users</h1>
          <p className="mt-2 text-sm text-muted-foreground">Search accounts, change roles, and deactivate access.</p>
        </div>
        <Button type="button" onClick={() => setBulkOpen(true)}>
          Bulk enroll
        </Button>
      </div>
      <form
        className="grid gap-3 md:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setApplied({ q, role });
        }}
      >
        <Input value={q} placeholder="Search name or email" aria-label="Search users" onChange={(event) => setQ(event.target.value)} />
        <select
          className="flex h-10 rounded-md border border-input bg-transparent px-3 text-sm"
          aria-label="Role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value="">All roles</option>
          {ROLES.map((item) => (
            <option key={item} value={item}>
              {roleLabel(item)}
            </option>
          ))}
        </select>
        <Button type="submit">Apply</Button>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!data ? <p className="text-sm text-muted-foreground">Loading users…</p> : null}
      {data ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                      No users match these filters.
                    </td>
                  </tr>
                ) : (
                  data.items.map((user) => (
                    <tr key={user.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">{user.name}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">
                        <select
                          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                          aria-label={`Role for ${user.email}`}
                          value={user.role}
                          disabled={busyId === user.id}
                          onChange={(event) => {
                            const next = event.target.value;
                            if (isRole(next) && next !== user.role) {
                              void patchUser(user, { role: next });
                            }
                          }}
                        >
                          {ROLES.map((item) => (
                            <option key={item} value={item}>
                              {roleLabel(item)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <Badge>{user.active ? 'Active' : 'Deactivated'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === user.id}
                          onClick={() => void patchUser(user, { active: !user.active })}
                        >
                          {user.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="text-muted-foreground">
              {data.total} users · page {data.page} of {pageCount}
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page >= pageCount}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}
      {bulkOpen ? <BulkEnroll onClose={() => setBulkOpen(false)} /> : null}
    </div>
  );
}

function BulkEnroll({ onClose }: { onClose: () => void }) {
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [courseId, setCourseId] = useState('');
  const [emails, setEmails] = useState('');
  const [csv, setCsv] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void apiRequest<CourseSummary[]>('/courses?status=PUBLISHED')
      .then((rows) => {
        const published = rows.filter((course) => course.status === 'PUBLISHED');
        setCourses(published);
        setCourseId(published[0]?.id ?? '');
      })
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.message : 'Could not load courses.');
      });
  }, []);

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10">
      <div role="dialog" aria-labelledby="bulk-enroll-title" className="w-full max-w-2xl rounded-lg border border-border bg-card p-6">
        <h2 id="bulk-enroll-title" className="text-xl font-semibold">
          Bulk enroll
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste emails or upload a CSV with email and name columns. New students receive a temporary password shown once on this screen.
        </p>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!courseId) {
              setError('Choose a published course.');
              return;
            }
            if (!emails.trim() && !csv.trim()) {
              setError('Paste emails or choose a CSV file.');
              return;
            }
            setBusy(true);
            setError(null);
            void apiRequest<BatchResult>('/admin/enrollments/batch', {
              method: 'POST',
              body: JSON.stringify({
                courseId,
                ...(emails.trim() ? { emails: [emails] } : {}),
                ...(csv.trim() ? { csv } : {}),
              }),
            })
              .then(setResult)
              .catch((caught: unknown) => {
                setError(caught instanceof ApiError ? caught.message : 'Could not enroll this batch.');
              })
              .finally(() => setBusy(false));
          }}
        >
          <select
            className="flex h-10 rounded-md border border-input bg-transparent px-3 text-sm"
            aria-label="Course"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
          >
            {courses === null ? <option value="">Loading courses…</option> : null}
            {courses?.length === 0 ? <option value="">No published courses</option> : null}
            {courses?.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title} · {course.level}
              </option>
            ))}
          </select>
          <textarea
            className="min-h-28 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            placeholder="alya@corp.test, budi@corp.test"
            aria-label="Email list"
            value={emails}
            onChange={(event) => setEmails(event.target.value)}
          />
          <input
            className="text-sm"
            type="file"
            accept=".csv,text/csv"
            aria-label="CSV file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                setCsv('');
                return;
              }
              void file.text().then(setCsv);
            }}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              Enroll batch
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </form>
        {result ? <BatchReport result={result} /> : null}
      </div>
    </div>
  );
}

function BatchReport({ result }: { result: BatchResult }) {
  return (
    <div className="mt-4 flex flex-col gap-3 text-sm">
      <p>
        {result.enrolled.length} enrolled · {result.skipped.length} skipped
      </p>
      {result.enrolled.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {result.enrolled.map((row) => (
            <li key={row.email} className="rounded-md border border-border px-3 py-2">
              <p>
                {row.name} · {row.email}
              </p>
              {row.temporaryPassword ? (
                <p className="mt-1 font-mono text-xs">Temporary password: {row.temporaryPassword}</p>
              ) : (
                <p className="mt-1 text-muted-foreground">Existing student. Password unchanged.</p>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {result.skipped.length > 0 ? (
        <ul className="flex flex-col gap-1 text-muted-foreground">
          {result.skipped.map((row) => (
            <li key={`${row.email}-${row.reason}`}>
              {row.email}: {row.reason}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function roleLabel(role: AppRole): string {
  if (role === 'SUPER_ADMIN') {
    return 'Admin';
  }
  if (role === 'INSTRUCTOR') {
    return 'Instructor';
  }
  return 'Student';
}

function isRole(value: string): value is AppRole {
  return ROLES.some((role) => role === value);
}
