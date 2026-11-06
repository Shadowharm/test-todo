import { useCallback, useEffect, useRef, useState } from "react";
import type { NewTask, Task, TaskChanges, TaskResult } from "../types";
import { dateKey, isDateKey, taskIsOverdue } from "../utils/dates";
import { STORAGE_KEY, TaskStore } from "../utils/taskStorage";
import { validateTask } from "../utils/validation";

export function useTasks() {
  const [store] = useState(
    () =>
      new TaskStore({
        getItem: (key) => window.localStorage.getItem(key),
        setItem: (key, value) => window.localStorage.setItem(key, value),
      }),
  );
  const [snapshot, setSnapshot] = useState(store.snapshot);
  const [now, setNow] = useState(() => Date.now());
  const [deleted, setDeleted] = useState<{ task: Task; index: number } | null>(
    null,
  );
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const change = useCallback(
    (operation: (tasks: Task[]) => Task[]): TaskResult => {
      const next = store.change(operation);
      setSnapshot(next);
      return { ok: true, persisted: next.issue === null };
    },
    [store],
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null)
        setSnapshot(store.refresh());
    };
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", sync);
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, [store]);

  const addTask = (task: NewTask): TaskResult => {
    const result = validateTask(task, true);
    if (!result.ok) return result;
    const newTask = {
      ...task,
      title: task.title.trim(),
      description: task.description.trim(),
      id: crypto.randomUUID(),
      done: false,
    };
    return change((tasks) => [...tasks, newTask]);
  };
  const update = (id: string, changes: TaskChanges): TaskResult => {
    const current = store.refresh().tasks.find((task) => task.id === id);
    if (!current)
      return {
        ok: false,
        field: "title",
        message: "Задача уже удалена в другой вкладке.",
      };
    const next = { ...current, ...changes };
    const result = validateTask(next, changes.date !== undefined);
    if (!result.ok) return result;
    return change((tasks) =>
      tasks.map((task) => (task.id === id ? { ...task, ...changes } : task)),
    );
  };
  const toggleTask = (id: string) =>
    change((tasks) =>
      tasks.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    );
  const moveTask = (id: string, date: string): TaskResult => {
    if (!isDateKey(date) || date < dateKey(new Date()))
      return {
        ok: false,
        field: "date",
        message: "Выберите сегодняшний или будущий день.",
      };
    return update(id, { date });
  };
  const deleteTask = (id: string) => {
    const tasks = store.refresh().tasks;
    const index = tasks.findIndex((task) => task.id === id);
    if (index < 0) return;
    setDeleted({ task: tasks[index], index });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setDeleted(null), 5000);
    change((items) => items.filter((task) => task.id !== id));
  };
  const undoDelete = () => {
    if (!deleted) return;
    const { task, index } = deleted;
    change((tasks) => {
      if (tasks.some((item) => item.id === task.id)) return tasks;
      const restored = [...tasks];
      restored.splice(Math.min(index, restored.length), 0, task);
      return restored;
    });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setDeleted(null);
  };
  return {
    tasks: snapshot.tasks,
    storageError: snapshot.issue,
    addTask,
    update,
    toggleTask,
    moveTask,
    deleteTask,
    isOverdue: (task: Task) => taskIsOverdue(task, now),
    deleted,
    undoDelete,
    retryStorage: () => change((tasks) => tasks),
  };
}
