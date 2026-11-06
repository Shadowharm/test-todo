import type { Task } from "../types";
import { isDateKey, isTime } from "./dates";

export const STORAGE_KEY = "dayline-tasks-v1";
export type StorageIssue = "read" | "invalid" | "write" | null;
export type TaskStorage = Pick<Storage, "getItem" | "setItem">;
type ReadResult =
  { ok: true; tasks: Task[] } | { ok: false; issue: "read" | "invalid" };
type Operation = (tasks: Task[]) => Task[];

export function readTasks(storage: TaskStorage): ReadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { ok: false, issue: "read" };
  }
  if (raw === null) return { ok: true, tasks: [] };
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return { ok: false, issue: "invalid" };
    const ids = new Set<string>();
    const tasks: Task[] = [];
    for (const item of value) {
      if (typeof item !== "object" || item === null)
        return { ok: false, issue: "invalid" };
      const task = item as Record<string, unknown>;
      if (
        typeof task.id !== "string" ||
        !task.id.trim() ||
        ids.has(task.id) ||
        typeof task.title !== "string" ||
        !task.title.trim() ||
        task.title.length > 120 ||
        typeof task.date !== "string" ||
        !isDateKey(task.date) ||
        typeof task.time !== "string" ||
        !isTime(task.time) ||
        (task.description !== undefined &&
          (typeof task.description !== "string" ||
            task.description.length > 300)) ||
        (task.done !== undefined && typeof task.done !== "boolean")
      )
        return { ok: false, issue: "invalid" };
      ids.add(task.id);
      tasks.push({
        id: task.id,
        title: task.title,
        description:
          typeof task.description === "string" ? task.description : "",
        date: task.date,
        time: task.time,
        done: task.done === true,
      });
    }
    return { ok: true, tasks };
  } catch {
    return { ok: false, issue: "invalid" };
  }
}

// Pending operations are replayed on the latest saved list after storage recovers.
// No mount-time write: unreadable data must never be replaced with an empty list.
export class TaskStore {
  snapshot: { tasks: Task[]; issue: StorageIssue };
  private pending: Operation[] = [];
  constructor(private storage: TaskStorage) {
    const result = readTasks(storage);
    this.snapshot = result.ok
      ? { tasks: result.tasks, issue: null }
      : { tasks: [], issue: result.issue };
  }
  refresh() {
    const result = readTasks(this.storage);
    if (!result.ok) {
      this.snapshot = { ...this.snapshot, issue: result.issue };
      return this.snapshot;
    }
    const tasks = this.pending.reduce(
      (current, operation) => operation(current),
      result.tasks,
    );
    this.snapshot = { tasks, issue: this.pending.length ? "write" : null };
    return this.snapshot;
  }
  change(operation: Operation) {
    const latest = readTasks(this.storage);
    const operations = [...this.pending, operation];
    const tasks = latest.ok
      ? operations.reduce((current, apply) => apply(current), latest.tasks)
      : operation(this.snapshot.tasks);
    let issue: StorageIssue = latest.ok ? null : latest.issue;
    if (latest.ok) {
      try {
        this.storage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      } catch {
        issue = "write";
      }
    }
    this.pending = issue ? operations : [];
    this.snapshot = { tasks, issue };
    return this.snapshot;
  }
}
