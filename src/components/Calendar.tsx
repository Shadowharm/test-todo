import type { Task } from "../types";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  capitalize,
  dateKey,
  formatDate,
  fromKey,
  mondayOf,
  shiftDate,
} from "../utils/dates";

export default function Calendar({
  selected,
  setSelected,
  tasks,
  dropDate,
}: {
  selected: string;
  setSelected: (value: string) => void;
  tasks: Task[];
  dropDate: string | null;
}) {
  const selectedDate = fromKey(selected);
  const days = Array.from({ length: 7 }, (_, index) =>
    shiftDate(mondayOf(selectedDate), index),
  );
  return (
    <>
      <div className="week-header">
        <div className="month-label">
          {capitalize(
            formatDate(selectedDate, { month: "long", year: "numeric" }),
          )}
        </div>
        <div className="week-actions">
          <button
            aria-label="Предыдущая неделя"
            onClick={() => setSelected(dateKey(shiftDate(selectedDate, -7)))}
          >
            <ArrowLeft size={17} />
          </button>
          <button
            aria-label="Следующая неделя"
            onClick={() => setSelected(dateKey(shiftDate(selectedDate, 7)))}
          >
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
      <div className="week" role="group" aria-label="Выберите день">
        {days.map((day) => {
          const key = dateKey(day);
          const hasTasks = tasks.some((task) => task.date === key);
          return (
            <button
              key={key}
              className={`day ${key === selected ? "selected" : ""} ${dropDate === key ? "drop-target" : ""}`}
              data-drop-date={key}
              onClick={() => setSelected(key)}
              aria-pressed={key === selected}
              aria-label={formatDate(day, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            >
              <span>
                {formatDate(day, { weekday: "short" }).replace(".", "")}
              </span>
              <strong>{day.getDate()}</strong>
              <i className={hasTasks ? "has-tasks" : ""} />
            </button>
          );
        })}
      </div>
    </>
  );
}
