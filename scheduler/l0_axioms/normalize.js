// Accept v3 flat courses and preserve compatibility with v2 offerings.
export function normalizeCourses(courses, term) {
  if (!Array.isArray(courses)) return courses;
  return courses.map(course => ({ ...course,
    credits: course.creditsKnown === false ? null : (course.credits ?? null),
    offerings: course.offerings ?? [{ term, sections: (course.sections ?? []).map(section => ({ ...section,
      type: section.type ?? 'CLASS', parent: section.parent ?? null, meetings: section.meetings ?? [],
    })) }],
  }));
}
export function normalizeOptions(options) {
  return { ...options, locked: Object.fromEntries(Object.entries(options.locked ?? {}).map(([code, lock]) =>
    [code, typeof lock === 'string' ? { CLASS: lock } : lock])) };
}
