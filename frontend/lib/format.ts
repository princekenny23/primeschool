export function money(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return `MK ${amount.toLocaleString("en-MW", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function shortDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function longDate(value: Date = new Date()) {
  return value.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

export function percent(value: number | string | null | undefined) {
  return `${Number(value ?? 0)}%`;
}

export function initials(name: string | undefined) {
  if (!name) return "??";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function downloadCsv(filename: string, columns: string[], rows: (string | number)[][]) {
  const escape = (cell: string | number) => `"${String(cell ?? "").replace(/"/g, '""')}"`;
  const csv = [columns.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
