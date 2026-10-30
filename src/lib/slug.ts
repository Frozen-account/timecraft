// Readable, unique ids for tasks: "Созвон с клиентом UK" -> "sozvon-s-klientom-uk".
// Shared by the browser draft store and POST /api/tasks, so ids look the same either way.
const CYR = "абвгдеёжзийклмнопрстуфхцчшщъыьэюяіїєґ";
const LAT = ["a", "b", "v", "g", "d", "e", "e", "zh", "z", "i", "y", "k", "l", "m", "n", "o", "p", "r", "s", "t", "u", "f", "h", "ts", "ch", "sh", "sch", "", "y", "", "e", "yu", "ya", "i", "yi", "ye", "g"];

export function slugify(title: string): string {
  return (
    [...title.toLowerCase()]
      .map((c) => (CYR.includes(c) ? LAT[CYR.indexOf(c)] : c))
      .join("")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
      .replace(/-+$/, "") || "task"
  );
}

export function uniqueSlug(title: string, taken: Set<string>): string {
  const base = slugify(title);
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}
