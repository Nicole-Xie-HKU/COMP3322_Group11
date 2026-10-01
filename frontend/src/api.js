export async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error?.message || data.error || "Something went wrong. Please try again.");
  return data;
}

export function searchCourses(term, query, signal) {
  return request(`/courses?${new URLSearchParams({ term, q: query })}`, {
    signal,
  });
}

export function getCourse(term, code) {
  return request(
    `/courses/${encodeURIComponent(code)}?${new URLSearchParams({ term })}`,
  );
}

export function generateSchedules(term, courses, locked, cursor) {
  return request("/schedules/generate", {
    method: "POST",
    body: JSON.stringify({
      term,
      courseCodes: courses.map((course) => course.code),
      locked,
      maxResults: 100, cursor,
    }),
  });
}
