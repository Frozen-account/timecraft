"use client";

// Tasks created in the UI before they are committed to backlog/tasks.json.
//
// backlog/tasks.json is read at build time and the deployment filesystem is read-only, so a
// draft lives in this browser until it is copied into the file (see the calendar's "copy JSON").
// Exposed as an external store rather than component state because the board, the calendar and
// the "+ Создать задачу" button are siblings that all have to see the same list.
import { useSyncExternalStore } from "react";
import type { Task } from "./types";

const KEY = "timecraft:schedule:new-tasks:v1"; // shared with the calendar's drafts
const CHANGE_EVENT = "timecraft:task-drafts-change";

const EMPTY: Task[] = []; // stable identity: a new array each call would loop useSyncExternalStore

// useSyncExternalStore compares snapshots by identity, so parsed drafts are cached until a write.
let cache: Task[] | null = null;

function isDraft(v: unknown): v is Task {
  const t = v as Partial<Task> | null;
  return Boolean(t && typeof t.id === "string" && typeof t.title === "string" && Array.isArray(t.tags));
}

function read(): Task[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isDraft) : EMPTY;
  } catch {
    return EMPTY; // private mode, blocked storage, or corrupt JSON
  }
}

function commit(next: Task[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: drafts stay in memory for this page view only.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function getSnapshot(): Task[] {
  if (cache === null) cache = read();
  return cache;
}

const getServerSnapshot = (): Task[] => EMPTY;

function subscribe(onChange: () => void): () => void {
  // Our own writes already populated the cache; re-reading would be wasteful and would drop
  // the draft if the localStorage write had failed. Only another tab invalidates it.
  const onLocal = () => onChange();
  const onForeign = () => {
    cache = null;
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onLocal);
  window.addEventListener("storage", onForeign);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onLocal);
    window.removeEventListener("storage", onForeign);
  };
}

/** Readable, unique ids for tasks.json: "Созвон с клиентом UK" -> "sozvon-s-klientom-uk". */
const CYR = "абвгдеёжзийклмнопрстуфхцчшщъыьэюяіїєґ";
const LAT = ["a", "b", "v", "g", "d", "e", "e", "zh", "z", "i", "y", "k", "l", "m", "n", "o", "p", "r", "s", "t", "u", "f", "h", "ts", "ch", "sh", "sch", "", "y", "", "e", "yu", "ya", "i", "yi", "ye", "g"];

function makeId(title: string, taken: Set<string>): string {
  const base =
    [...title.toLowerCase()]
      .map((c) => (CYR.includes(c) ? LAT[CYR.indexOf(c)] : c))
      .join("")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
      .replace(/-+$/, "") || "task";
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

export function useTaskDrafts(): Task[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Adds a draft, deriving a readable id that collides with neither file tasks nor other drafts. */
export function addDraft(draft: Omit<Task, "id">, taken: Iterable<string>): Task {
  const current = getSnapshot();
  const task: Task = { id: makeId(draft.title, new Set([...taken, ...current.map((t) => t.id)])), ...draft };
  commit([...current, task]);
  return task;
}

export function updateDraft(id: string, patch: Partial<Omit<Task, "id">>): void {
  commit(getSnapshot().map((t) => (t.id === id ? { ...t, ...patch } : t)));
}

export function removeDraft(id: string): void {
  commit(getSnapshot().filter((t) => t.id !== id));
}

export function clearDrafts(): void {
  commit([]);
}
