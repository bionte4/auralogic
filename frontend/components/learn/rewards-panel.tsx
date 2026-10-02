'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, apiRequest } from '@/lib/api';

interface RewardBadge {
  code: 'LEVEL_COMPLETE' | 'DISTINCTION';
  courseId: string;
  label: string;
  awardedAt: string;
}

interface QuizHistoryItem {
  lessonTitle: string;
  levelTitle: string;
  levelIndex: number;
  courseTitle: string;
  score: number;
  passed: boolean;
  createdAt: string;
}

interface RewardsView {
  xp: number;
  streakCount: number;
  badges: RewardBadge[];
  quizAttempts: QuizHistoryItem[];
}

export function RewardsPanel() {
  const [rewards, setRewards] = useState<RewardsView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiRequest<RewardsView>('/me/rewards')
      .then(setRewards)
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.message : 'Could not load rewards.');
      });
  }, []);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!rewards) {
    return <p className="text-sm text-muted-foreground">Loading rewards…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Quiz history</CardTitle>
        </CardHeader>
        <CardContent>
          {rewards.quizAttempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quiz attempts yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {rewards.quizAttempts.map((attempt) => (
                <li key={`${attempt.createdAt}-${attempt.lessonTitle}`} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    {attempt.courseTitle} · Level {attempt.levelIndex} · {attempt.lessonTitle}
                  </span>
                  <Badge>
                    {attempt.score} · {attempt.passed ? 'Passed' : 'Below pass'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
