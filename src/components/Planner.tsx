import { ArrowRight, CalendarDays, Plus } from "lucide-react";
import type { useTaskDrag } from "../hooks/useTaskDrag";
import type { useTasks } from "../hooks/useTasks";
import { capitalize, dateKey, formatDate, fromKey } from "../utils/dates";
import Calendar from "./Calendar";
import TaskCard from "./TaskCard";

type Props = {
  selected: string;
  setSelected: (date: string) => void;
  onAddClick: () => void;
  taskStore: ReturnType<typeof useTasks>;
  drag: ReturnType<typeof useTaskDrag>;
};

export default function Planner({
  selected,
  setSelected,
  onAddClick,
  taskStore,
  drag,
}: Props) {
  const { tasks, toggleTask, update, deleteTask, isOverdue } = taskStore;
  const today = dateKey(new Date());
  const selectedDate = fromKey(selected);
  const heading =
    selected === today
      ? "Сегодня"
      : capitalize(formatDate(selectedDate, { day: "numeric", month: "long" }));

  // Задачи без указанного времени идут после задач со временем.
  const dayTasks = tasks
    .filter((task) => task.date === selected)
    .sort((a, b) => {
      if (!a.time) return b.time ? 1 : 0;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  const completed = dayTasks.filter((task) => task.done).length;
  const nextTaskId = dayTasks.find(
    (task) => !task.done && !isOverdue(task),
  )?.id;

  return (
    <section className="planner" aria-label="Планировщик задач">
      <div className="planner-header">
        <div>
          <h1>
            {heading}
            <span className="heading-dot">.</span>
          </h1>
          <p>
            {capitalize(
              formatDate(selectedDate, {
                weekday: "long",
                day: "numeric",
                month: "long",
              }),
            )}
          </p>
        </div>
        <button className="today-button" onClick={() => setSelected(today)}>
          Сегодня <ArrowRight size={15} />
        </button>
      </div>

      <Calendar
        selected={selected}
        setSelected={setSelected}
        tasks={tasks}
        dropDate={drag.dropDate}
      />
      <div className="divider" />
      <div className="timeline-heading">
        <h3>Задачи</h3>
        <span className="task-count">
          {completed} / {dayTasks.length} выполнено
        </span>
      </div>

      {dayTasks.length > 0 ? (
        <div className="timeline">
          {dayTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              overdue={isOverdue(task)}
              featured={task.id === nextTaskId}
              toggleTask={toggleTask}
              update={update}
              deleteTask={deleteTask}
              drag={drag}
              moveTask={(id, date) => {
                const result = taskStore.moveTask(id, date);
                if (result.ok) setSelected(date);
                return result;
              }}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <CalendarDays size={24} />
          </div>
          <h4>На этот день задач нет</h4>
        </div>
      )}
      <div className="planner-footer">
        <button
          className="add-button"
          onClick={(event) => {
            event.currentTarget.focus();
            onAddClick();
          }}
        >
          <Plus size={19} /> <span>Новая задача</span>
        </button>
      </div>
    </section>
  );
}
