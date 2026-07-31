const EXERCISE_TYPES = new Set(['drill', 'code-along']);

export function flattenExercises(lessonsData) {
  const exercises = [];

  (lessonsData?.tracks || []).forEach((track) => {
    (track.lessons || []).forEach((lesson) => {
      (lesson.activities || []).forEach((activity) => {
        if (!EXERCISE_TYPES.has(activity.type) || !activity.starterCode || !activity.solution) return;
        const formatLabel = activity.type === 'code-along' ? 'Code-along' : 'Retrieval drill';
        exercises.push({
          id: activity.id,
          kind: 'exercise',
          exerciseType: activity.type,
          title: `${lesson.concept} · ${formatLabel}`,
          concept: lesson.concept,
          summary: activity.successCriteria || `Practise ${lesson.concept} outside the course path.`,
          task: activity.instruction,
          successCriteria: activity.successCriteria || activity.expectedOutput,
          activities: [{ ...activity }],
          teaching: [],
          starterCode: activity.starterCode,
          expectedOutput: activity.expectedOutput,
          matchType: activity.matchType || 'exact',
          hints: activity.hints || [],
          solution: activity.solution,
          language: track.language,
          trackId: track.id,
          trackName: track.name,
          sourceLessonId: lesson.id,
          sourceLessonTitle: lesson.title,
        });
      });
    });
  });

  return exercises;
}

export function findExercise(lessonsData, exerciseId) {
  return flattenExercises(lessonsData).find((exercise) => exercise.id === exerciseId) || null;
}

export function isCourseActivity(activity) {
  return !EXERCISE_TYPES.has(activity?.type);
}
