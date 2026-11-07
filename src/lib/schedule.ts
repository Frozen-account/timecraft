// Day-grid constants and time helpers, shared by the week grid, the day timeline and the
// schedule dialog. Kept in lib/ so those three never import each other just for a constant —
// the same reason labels.ts exists.

/** The visible band of the day. Tasks outside it still exist; the grid just clips them. */
export const START_HOUR = 8;
export const END_HOUR = 20;
/** Pixel height of one hour in the week grid's absolute layout. */
export const HOUR_PX = 64;

export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const fmtTime = (mins: number): string =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

/** Half-hour steps across the visible band, for the "start at" dropdown. */
export const TIME_OPTIONS = Array.from({ length: (END_HOUR - START_HOUR) * 2 }, (_, i) =>
  fmtTime(START_HOUR * 60 + i * 30),
);

export const DURATIONS = [30, 60, 90, 120, 180, 240];

export const fmtDuration = (mins: number): string => (mins < 60 ? `${mins} мин` : `${mins / 60} ч`);

/** Minutes a task occupies, defaulting to an hour — the same default the grid lays out with. */
export const taskEnd = (startMinutes: number, durationMinutes?: number): number =>
  startMinutes + (durationMinutes ?? 60);
