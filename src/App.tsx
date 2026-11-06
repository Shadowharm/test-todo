import { useCallback, useState } from "react";
import { Check } from "lucide-react";
import Planner from "./components/Planner";
import TaskForm from "./components/TaskForm";
import Weather from "./components/Weather";
import { useTaskDrag } from "./hooks/useTaskDrag";
import { useTasks } from "./hooks/useTasks";
import type { NewTask } from "./types";
import { dateKey, isDateKey } from "./utils/dates";

const SELECTED_KEY = "dayline-selected-date";
function initialDate() {
  try {
    const value = sessionStorage.getItem(SELECTED_KEY);
    if (value && isDateKey(value)) return value;
  } catch {
    /* session storage is optional */
  }
  return dateKey(new Date());
}
export default function App() {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [isFormOpen, setFormOpen] = useState(false);
  const taskStore = useTasks();
  const drag = useTaskDrag(taskStore.moveTask);
  const selectDate = useCallback((date: string) => {
    setSelectedDate(date);
    try {
      sessionStorage.setItem(SELECTED_KEY, date);
    } catch {
      /* navigation works without persistence */
    }
  }, []);
  const closeForm = useCallback(() => setFormOpen(false), []);
  const handleAdd = (task: NewTask) => {
    const result = taskStore.addTask(task);
    if (result.ok) {
      selectDate(task.date);
      closeForm();
    }
    return result;
  };
  const storageMessages = {
    read: "Не удалось прочитать сохранённые задачи. Исходные данные не изменены. Новые изменения пока доступны только в этой вкладке.",
    invalid:
      "Сохранённые данные повреждены. Исходные данные не изменены. Новые изменения пока доступны только в этой вкладке.",
    write:
      "Не удалось сохранить задачи. Изменения пока доступны только в этой вкладке.",
  };
  return (
    <div className="page-shell">
      <main className="app">
        <header className="topbar">
          <a className="brand" href="#top" aria-label="День за днём, главная">
            <span className="brand-mark">
              <Check size={15} strokeWidth={3} />
            </span>
            <span>
              день за днём<span className="brand-dot">.</span>
            </span>
          </a>
          <Weather />
        </header>
        <div className="content" id="top">
          {taskStore.storageError && (
            <div className="storage-error" role="alert">
              <p>{storageMessages[taskStore.storageError]}</p>
              <button onClick={taskStore.retryStorage}>
                Повторить сохранение
              </button>
            </div>
          )}
          <Planner
            selected={selectedDate}
            setSelected={selectDate}
            onAddClick={() => setFormOpen(true)}
            taskStore={taskStore}
            drag={drag}
          />
        </div>
        {taskStore.deleted && (
          <div className="undo-toast">
            <span role="status">Задача удалена</span>
            <button onClick={taskStore.undoDelete}>Отменить</button>
          </div>
        )}
        {isFormOpen && (
          <TaskForm
            selected={selectedDate}
            onClose={closeForm}
            onAdd={handleAdd}
          />
        )}
      </main>
    </div>
  );
}
