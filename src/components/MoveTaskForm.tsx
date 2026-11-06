import { useId, useRef, useState } from "react";
import type { Task, TaskResult } from "../types";
import { dateKey } from "../utils/dates";
import Modal from "./Modal";

export default function MoveTaskForm({
  task,
  onMove,
  onClose,
}: {
  task: Task;
  onMove: (date: string) => TaskResult;
  onClose: () => void;
}) {
  const today = dateKey(new Date());
  const [date, setDate] = useState(task.date < today ? today : task.date);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const errorId = useId();
  return (
    <Modal title="Перенести задачу" onClose={onClose}>
      <p className="modal-description">{task.title}</p>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const result = onMove(date);
          if (result.ok) onClose();
          else {
            setError(result.message);
            input.current?.focus();
          }
        }}
      >
        <label>
          Новая дата
          <input
            ref={input}
            type="date"
            min={today}
            value={date}
            required
            aria-invalid={!!error || undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              setDate(event.target.value);
              setError("");
            }}
          />
          {error && (
            <span id={errorId} className="field-error" role="alert">
              {error}
            </span>
          )}
        </label>
        <button className="submit-button" type="submit">
          Перенести
        </button>
      </form>
    </Modal>
  );
}
