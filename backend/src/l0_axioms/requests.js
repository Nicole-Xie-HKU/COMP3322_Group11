const { z } = require('zod');
const { ApiError } = require('./errors');
const code = z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{1,20}$/);
const sectionId = z.string().trim().regex(/^[A-Za-z0-9_-]{1,20}$/);
const term = z.string().trim().regex(/^\d{4}-\d{2}(?:-S[12U]| Sem [12]| Sum Sem)$/).transform(value =>
  value.replace('-S1',' Sem 1').replace('-S2',' Sem 2').replace('-SU',' Sum Sem'));
const sectionKey = z.string().trim().regex(/^[A-Za-z0-9_-]{1,20}:[A-Za-z0-9_-]{1,20}$/).transform(value => {
  const [course, section] = value.split(':'); return `${course.toUpperCase()}:${section}`;
});
const sectionKeys = z.array(sectionKey).min(1).max(72).refine(keys => new Set(keys).size === keys.length, 'Duplicate section keys');
const minute = z.number().int().min(0).max(1440);
const block = z.strictObject({ day: z.number().int().min(1).max(7), start: minute, end: minute,
  label: z.string().trim().max(100).optional(), hard: z.boolean().optional() }).refine(value => value.start < value.end, 'start must be before end');
const blocked = z.array(block).max(32);
const types = z.enum(['CLASS','LEC','TUT','LAB','SEM','OTH']);
const locked = z.record(code, z.union([sectionId,z.partialRecord(types,sectionId)])).refine(value => Object.keys(value).length <= 12);
const prefs = z.strictObject({ noMorningBefore: minute.optional(), noEveningAfter: minute.optional(),
  avoidDays: z.array(z.number().int().min(1).max(7)).max(7).optional(), preferFreeDays: z.boolean().optional(),
  minimizeGaps: z.boolean().optional(), lunchBreak: z.strictObject({ from: minute, to: minute, minutes: minute })
    .refine(value => value.from < value.to && value.minutes <= value.to-value.from).optional(),
  weights: z.partialRecord(z.enum(['morning','freeDay','avoidDay','lunch','gapHour','lateEvening','softBlocked']),z.number().min(0).max(100)).optional(),
});
const generation = z.strictObject({ term, courseCodes: z.array(code).min(1).max(12).transform(codes => [...new Set(codes)].sort()),
  blocked: blocked.default([]), locked: locked.default({}), excluded: z.array(sectionKey).max(72).default([]),
  seatPolicy: z.enum(['ignore','allowWaitlist','openOnly']).default('allowWaitlist'), prefs: prefs.default({}),
  includeUnknownTimes: z.boolean().default(false),
  maxResults: z.number().int().min(1).max(100).default(100), cursor: z.string().max(8192).optional(),
});
const selection = z.strictObject({ term, sectionKeys, blocked: blocked.default([]) });
const name = z.string().trim().min(1).max(100).refine(value => !/[\x00-\x1f\x7f]/.test(value), 'Name contains control characters');
const save = z.strictObject({ term, sectionKeys, blocked: blocked.default([]), name });
const update = z.strictObject({ term: term.optional(), sectionKeys: sectionKeys.optional(), blocked: blocked.optional(), name: name.optional() })
  .refine(value => Object.keys(value).length > 0, 'Provide at least one field');
const search = z.strictObject({ term, q: z.string().trim().max(100).default(''), limit: z.coerce.number().int().min(1).max(100).default(30) });
const detail = z.strictObject({ term });
function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400,'INVALID_REQUEST','Request validation failed.',
    result.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })));
  return result.data;
}
const id = z.coerce.number().int().min(1).max(2147483647);
module.exports = { parse, generation, selection, save, update, search, detail, code, id, empty: z.strictObject({}) };
