// Local-time date helpers. Everything builds dates through the (y, m, d) constructor rather than
// by adding milliseconds, so DST transitions cannot shift a day or collapse two into one.

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Monday of the week containing `d` (ISO weeks start on Monday). */
export const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

/** Thursday of the ISO week containing `d` — the day that decides which ISO year the week is in. */
const isoThursday = (d: Date) => addDays(d, 3 - ((d.getDay() + 6) % 7));

/**
 * ISO-8601 week number. Week 1 is the week containing the first Thursday of the year, which is
 * the same as the week containing 4 January.
 */
export function isoWeek(d: Date): number {
  const thursday = isoThursday(d);
  const firstThursday = isoThursday(new Date(thursday.getFullYear(), 0, 4));
  // Both operands are Thursdays, so the gap is a whole number of weeks regardless of DST.
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

/** The ISO year `d` belongs to, which differs from the calendar year around New Year. */
export const isoWeekYear = (d: Date): number => isoThursday(d).getFullYear();

/** 52 or 53. 28 December is always in the last ISO week of its year. */
export const isoWeeksInYear = (year: number): number => isoWeek(new Date(year, 11, 28));

/** Monday of ISO week `week` in ISO year `year`. */
export const mondayOfIsoWeek = (week: number, year: number): Date =>
  addDays(mondayOf(new Date(year, 0, 4)), (week - 1) * 7);

export function isoWeekRange(week: number, year: number): { start: Date; end: Date } {
  const start = mondayOfIsoWeek(week, year);
  return { start, end: addDays(start, 6) };
}
