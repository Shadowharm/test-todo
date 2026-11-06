import type { NewTask, TaskResult } from "../types";
import { dateKey, isDateKey, isTime } from "./dates";

export function validateTask(task: NewTask, requireFuture = false): TaskResult {
  if (!task.title.trim())
    return {
      ok: false,
      field: "title",
      message: "Введите название задачи — не только пробелы.",
    };
  if (task.title.length > 120)
    return {
      ok: false,
      field: "title",
      message: "Название должно быть не длиннее 120 символов.",
    };
  if (task.description.length > 300)
    return {
      ok: false,
      field: "description",
      message: "Описание должно быть не длиннее 300 символов.",
    };
  if (!isDateKey(task.date))
    return { ok: false, field: "date", message: "Укажите корректную дату." };
  if (requireFuture && task.date < dateKey(new Date()))
    return {
      ok: false,
      field: "date",
      message: "Выберите сегодняшний или будущий день.",
    };
  if (!isTime(task.time))
    return {
      ok: false,
      field: "time",
      message: "Укажите время в формате ЧЧ:ММ.",
    };
  return { ok: true, persisted: true };
}
