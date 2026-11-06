export const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const fromKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const shiftDate = (date: Date, amount: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};
export const mondayOf = (date: Date) =>
  shiftDate(date, -((date.getDay() + 6) % 7));
export const formatDate = (date: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("ru-RU", options).format(date);
export const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export const isDateKey = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = fromKey(value);
  return Number.isFinite(date.getTime()) && dateKey(date) === value;
};
export const isTime = (value: string) =>
  value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export const taskIsOverdue = (
  task: { done: boolean; date: string; time: string },
  now: number,
) =>
  !task.done &&
  (task.time
    ? new Date(`${task.date}T${task.time}:00`).getTime() <
      Math.floor(now / 60000) * 60000
    : task.date < dateKey(new Date(now)));
