export interface GradedQuestion {
  id: string;
  correctChoiceId: string;
  choiceIds: readonly string[];
}

export interface QuizAnswer {
  questionId: string;
  choiceId: string;
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap] as T;
    copy[swap] = current as T;
  }
  return copy;
}

export function scoreAttempt(questions: readonly GradedQuestion[], answers: readonly QuizAnswer[]): { correct: number; score: number } {
  if (questions.length === 0 || answers.length !== questions.length) {
    throw new Error('Answer every question once.');
  }
  const byId = new Map(questions.map((question) => [question.id, question]));
  const seen = new Set<string>();
  let correct = 0;
  for (const answer of answers) {
    const question = byId.get(answer.questionId);
    if (!question || seen.has(answer.questionId) || !question.choiceIds.includes(answer.choiceId)) {
      throw new Error('Answer every question once.');
    }
    seen.add(answer.questionId);
    if (answer.choiceId === question.correctChoiceId) {
      correct += 1;
    }
  }
  return { correct, score: Math.round((correct / questions.length) * 100) };
}

export function quizPassed(score: number, passingScore: number): boolean {
  return score >= passingScore;
}
