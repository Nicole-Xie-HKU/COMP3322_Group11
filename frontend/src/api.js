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

export function searchCourses(
  term,
  query,
  department,
  signal
) {
  return request(
    `/courses?${new URLSearchParams({
      term,
      q: query,
      dept: department || ""
    })}`,
    {
      signal,
    }
  );
}

export function getDepartments() {
  return request("/departments");
}

export function getCourse(term, code) {
  return request(
    `/courses/${encodeURIComponent(code)}?${new URLSearchParams({ term })}`,
  );
}

export function generateSchedules(term, courses, locked, cursor, includeUnknownTimes = false, blocked = []) {
  return request("/schedules/generate", {
    method: "POST",
    body: JSON.stringify({
      term,
      courseCodes: courses.map((course) => course.code),
      locked,
      blocked: blocked.map(({ id, ...event }) => event),
      maxResults: 100, cursor, includeUnknownTimes,
    }),
  });
}
