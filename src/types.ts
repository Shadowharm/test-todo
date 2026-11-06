export interface Task {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  done: boolean;
}

export type NewTask = Pick<Task, "title" | "description" | "date" | "time">;
export type TaskChanges = Partial<
  Pick<Task, "title" | "description" | "date" | "time">
>;

export type TaskResult =
  | { ok: true; persisted: boolean }
  | { ok: false; field: keyof NewTask; message: string };
