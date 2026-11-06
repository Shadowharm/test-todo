import { useState } from "react";
import type { Task, TaskChanges, TaskResult } from "../types";
import type { useTaskDrag } from "../hooks/useTaskDrag";
import {
  CalendarArrowUp,
  Check,
  Clock3,
  GripVertical,
  Trash2,
} from "lucide-react";
import EditableText from "./EditableText";
import MoveTaskForm from "./MoveTaskForm";

export default function TaskCard({
  task,
  overdue,
  featured,
  toggleTask,
  update,
  deleteTask,
  drag,
  moveTask,
}: {
  task: Task;
  overdue: boolean;
  featured: boolean;
  toggleTask: (id: string) => void;
  update: (id: string, changes: TaskChanges) => TaskResult;
  deleteTask: (id: string) => void;
  drag: ReturnType<typeof useTaskDrag>;
  moveTask: (id: string, date: string) => TaskResult;
}) {
  const [moving, setMoving] = useState(false);
  return (
    <article
      className={`task ${task.done ? "done" : ""} ${overdue ? "overdue" : ""} ${featured ? "featured" : ""}`}
    >
      <div className="timeline-point">
        <span />
      </div>
      <div className="task-card">
        <span
          className="drag-handle"
          aria-label="Перетащить задачу"
          onPointerDown={(event) => drag.startDrag(event, task)}
          onPointerMove={drag.updateDrag}
          onPointerUp={drag.endDrag}
          onPointerCancel={drag.endDrag}
        >
          <GripVertical size={17} />
        </span>
        <button
          className="check-button"
          onClick={() => toggleTask(task.id)}
          aria-label={
            task.done
              ? `Отметить «${task.title}» невыполненной`
              : `Отметить «${task.title}» выполненной`
          }
          aria-pressed={!!task.done}
        >
          {task.done && <Check size={15} strokeWidth={3} />}
        </button>
        <div className="task-content">
          <div className="task-top">
            <EditableText
              value={task.title}
              label="Изменить название"
              onSave={(title) => update(task.id, { title })}
            />
            <label className="task-time" title="Изменить время">
              <Clock3 size={14} />
              <input
                type="time"
                value={task.time}
                onChange={(event) =>
                  update(task.id, { time: event.target.value })
                }
                aria-label={`Изменить время задачи «${task.title}»`}
              />
            </label>
          </div>
          <EditableText
            value={task.description}
            multiline
            label="Изменить описание"
            onSave={(description) => update(task.id, { description })}
          />
          <span className="task-status">
            {task.done ? "ВЫПОЛНЕНО" : overdue ? "ПРОСРОЧЕНО" : "ЗАПЛАНИРОВАНО"}
          </span>
        </div>
        <div className="task-actions">
          <button
            className="move-button"
            onClick={(event) => {
              event.currentTarget.focus();
              setMoving(true);
            }}
            aria-label={`Перенести задачу «${task.title}»`}
            title="Перенести на другой день"
          >
            <CalendarArrowUp size={17} />
          </button>
          <button
            className="delete-button"
            onClick={() => deleteTask(task.id)}
            aria-label={`Удалить задачу «${task.title}»`}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      {moving && (
        <MoveTaskForm
          task={task}
          onClose={() => setMoving(false)}
          onMove={(date) => moveTask(task.id, date)}
        />
      )}
    </article>
  );
}
