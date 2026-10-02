'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, apiRequest } from '@/lib/api';
import { formatIdr } from '@/lib/course-draft';
import type { CourseRoster } from '@/lib/courses';

export function ClassRoster({
  courseId,
  roster,
  onChange,
}: {
  courseId: string;
  roster: CourseRoster | null;
  onChange: () => Promise<void>;
}) {
  const [className, setClassName] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [studentId, setStudentId] = useState('');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  if (!roster || roster.enrollments.length === 0) {
    return <p className="text-sm text-muted-foreground">No enrollments yet. Payment stays pending until a webhook verifies it.</p>;
  }

  const rows = selectedClass
    ? roster.enrollments.filter((entry) => entry.classIds.includes(selectedClass))
    : roster.enrollments;

  async function createClass(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    try {
      await apiRequest(`/courses/${courseId}/classes`, {
        method: 'POST',
        body: JSON.stringify({ name: className.trim() }),
      });
      setClassName('');
      await onChange();
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not create the class.');
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedClass || !studentId) {
      setError('Choose a class and a student.');
      return;
    }
    setError(null);
    try {
      await apiRequest(`/courses/${courseId}/classes/${selectedClass}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId: studentId }),
      });
      await onChange();
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not add the student to this class.');
    }
  }

  async function score(student: string): Promise<void> {
    const value = Number(scores[student] ?? '');
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      setError('Enter a project score from 0 to 100.');
      return;
    }
    setError(null);
    try {
      await apiRequest(`/courses/${courseId}/project/submissions/${student}`, {
        method: 'PATCH',
        body: JSON.stringify({ score: value }),
      });
      await onChange();
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not save the project score.');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => void createClass(event)}>
        <Input
          aria-label="Class name"
          placeholder="Class name, for example 7A"
          value={className}
          onChange={(event) => setClassName(event.target.value)}
        />
        <Button type="submit" className="min-h-11">
          Add class
        </Button>
      </form>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
          Class
          <select
            className="h-11 rounded-md border border-input bg-transparent px-3 text-sm text-foreground"
            value={selectedClass}
            onChange={(event) => setSelectedClass(event.target.value)}
          >
            <option value="">All students</option>
            {roster.classes.map((courseClass) => (
              <option key={courseClass.id} value={courseClass.id}>
                {courseClass.name}
              </option>
            ))}
          </select>
        </label>
        <form className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(event) => void addMember(event)}>
          <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
            Add to the selected class
            <select
              className="h-11 rounded-md border border-input bg-transparent px-3 text-sm text-foreground"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
            >
              <option value="">Student</option>
              {roster.enrollments.map((entry) => (
                <option key={entry.student.id} value={entry.student.id}>
                  {entry.student.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="outline" className="min-h-11">
            Add
          </Button>
        </form>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">This class has no students yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Enrollment</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Starts at</th>
                <th className="px-4 py-3 font-medium">Project</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry.enrollmentId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{entry.student.name}</p>
                    <p className="text-muted-foreground">{entry.student.email}</p>
                  </td>
                  <td className="px-4 py-3">{entry.status}</td>
                  <td className="px-4 py-3">
                    {entry.paymentStatus}
                    {entry.paidAt ? <span className="block text-xs text-muted-foreground">{entry.paidAt.slice(0, 10)}</span> : null}
                  </td>
                  <td className="px-4 py-3">{formatIdr(entry.amount)}</td>
                  <td className="px-4 py-3">
                    {entry.completedLessons}/{entry.lessonCount} · {entry.progressPercent}%
                  </td>
                  <td className="px-4 py-3">{entry.startOrderIndex ? `Level ${entry.startOrderIndex}` : '—'}</td>
                  <td className="px-4 py-3">
                    {entry.projectScore !== null ? (
                      entry.projectScore
                    ) : entry.projectSubmitted ? (
                      <form
                        className="flex items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void score(entry.student.id);
                        }}
                      >
                        <Input
                          aria-label={`Score for ${entry.student.name}`}
                          className="h-9 w-16"
                          inputMode="numeric"
                          value={scores[entry.student.id] ?? ''}
                          onChange={(event) => setScores({ ...scores, [entry.student.id]: event.target.value })}
                        />
                        <Button type="submit" size="sm">
                          Score
                        </Button>
                      </form>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
