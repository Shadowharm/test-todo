import { describe, expect, it } from "vitest";
import { readTasks, STORAGE_KEY, TaskStore } from "./taskStorage";
import type { Task, NewTask } from "../types";
import { validateTask } from "./validation";
import { taskIsOverdue, isDateKey, mondayOf, dateKey } from "./dates";

const task: Task = {
  id: "one",
  title: "Прогулка",
  description: "",
  date: "2099-01-01",
  time: "",
  done: false,
};
function storage(initial: string | null = null) {
  let raw = initial;
  const control = {
    readDenied: false,
    writeDenied: false,
    writes: 0,
    get raw() {
      return raw;
    },
    getItem: (_key: string) => {
      if (control.readDenied) throw Error("read");
      return raw;
    },
    setItem: (_key: string, value: string) => {
      if (control.writeDenied) throw Error("write");
      control.writes++;
      raw = value;
    },
  };
  return control;
}

describe("task persistence", () => {
  it("accepts empty storage and legacy tasks without optional fields", () => {
    expect(readTasks(storage())).toEqual({ ok: true, tasks: [] });
    const { description: _description, done: _done, ...legacy } = task;
    expect(readTasks(storage(JSON.stringify([legacy])))).toEqual({
      ok: true,
      tasks: [task],
    });
  });
  it.each([
    "{broken",
    "null",
    "{}",
    JSON.stringify([{ ...task, title: "   " }]),
    JSON.stringify([{ ...task, date: "2026-02-30" }]),
    JSON.stringify([{ ...task, time: "25:10" }]),
    JSON.stringify([task, task]),
  ])("preserves invalid source data: %s", (raw) => {
    const disk = storage(raw);
    const store = new TaskStore(disk);
    expect(store.snapshot.issue).toBe("invalid");
    store.change((tasks) => [...tasks, task]);
    expect(disk.raw).toBe(raw);
    expect(disk.writes).toBe(0);
  });
  it("does not write on construction or refresh", () => {
    const disk = storage(JSON.stringify([task]));
    const store = new TaskStore(disk);
    store.refresh();
    expect(disk.writes).toBe(0);
  });
  it("keeps edits in memory when reading fails and replays them after recovery", () => {
    const disk = storage(JSON.stringify([task]));
    disk.readDenied = true;
    const store = new TaskStore(disk);
    store.change((tasks) => [...tasks, { ...task, id: "two" }]);
    expect(store.snapshot.issue).toBe("read");
    expect(disk.writes).toBe(0);
    disk.readDenied = false;
    store.change((tasks) => tasks);
    expect(store.snapshot.tasks.map((item) => item.id)).toEqual(["one", "two"]);
    expect(store.snapshot.issue).toBeNull();
  });
  it("rebases failed writes over another tab's additions", () => {
    const disk = storage("[]");
    const first = new TaskStore(disk),
      second = new TaskStore(disk);
    disk.writeDenied = true;
    first.change((tasks) => [...tasks, task]);
    expect(first.snapshot.issue).toBe("write");
    disk.writeDenied = false;
    second.change((tasks) => [...tasks, { ...task, id: "two" }]);
    first.refresh();
    first.change((tasks) => tasks);
    expect(first.snapshot.tasks.map((item) => item.id)).toEqual(["two", "one"]);
  });
  it("preserves sequential edits made in two tabs", () => {
    const disk = storage();
    const first = new TaskStore(disk),
      second = new TaskStore(disk);
    first.change((tasks) => [...tasks, task]);
    second.change((tasks) => [...tasks, { ...task, id: "two" }]);
    expect(first.refresh().tasks).toHaveLength(2);
    second.change((tasks) => tasks.filter((item) => item.id !== "one"));
    expect(first.refresh().tasks.map((item) => item.id)).toEqual(["two"]);
    expect(STORAGE_KEY).toBe("dayline-tasks-v1");
  });
});

describe("validation and local dates", () => {
  it.each([
    [{ title: " " }, "title"],
    [{ title: "x".repeat(121) }, "title"],
    [{ description: "x".repeat(301) }, "description"],
    [{ date: "2026-02-30" }, "date"],
    [{ time: "24:00" }, "time"],
  ])("rejects invalid fields %j", (changes, field) => {
    expect(validateTask({ ...task, ...changes } as NewTask)).toMatchObject({
      ok: false,
      field,
    });
  });
  it("accepts maximum lengths, leap dates and an empty time", () => {
    expect(
      validateTask({
        ...task,
        title: "x".repeat(120),
        description: "x".repeat(300),
      }),
    ).toMatchObject({ ok: true });
    expect(isDateKey("2028-02-29")).toBe(true);
    expect(isDateKey("2027-02-29")).toBe(false);
    expect(dateKey(mondayOf(new Date(2026, 10, 8)))).toBe("2026-11-02");
  });
  it("marks tasks without a time overdue only after local midnight", () => {
    const day = { ...task, date: "2026-11-06" };
    expect(taskIsOverdue(day, new Date(2026, 10, 6, 23, 59).getTime())).toBe(
      false,
    );
    expect(taskIsOverdue(day, new Date(2026, 10, 7, 0, 0).getTime())).toBe(
      true,
    );
    expect(
      taskIsOverdue({ ...day, done: true }, new Date(2026, 10, 7).getTime()),
    ).toBe(false);
  });
  it("respects the deadline minute", () => {
    const day = { ...task, date: "2026-11-06", time: "09:00" };
    expect(taskIsOverdue(day, new Date(2026, 10, 6, 9, 0, 59).getTime())).toBe(
      false,
    );
    expect(taskIsOverdue(day, new Date(2026, 10, 6, 9, 1).getTime())).toBe(
      true,
    );
  });
});
