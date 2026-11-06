import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import type { NewTask, TaskResult } from "../types";
import { dateKey } from "../utils/dates";
import Modal from "./Modal";

export default function TaskForm({
  selected,
  onClose,
  onAdd,
}: {
  selected: string;
  onClose: () => void;
  onAdd: (task: NewTask) => TaskResult;
}) {
  const today = dateKey(new Date());
  const [task, setTask] = useState<NewTask>({
    title: "",
    description: "",
    date: selected < today ? today : selected,
    time: "",
  });
  const [error, setError] = useState<{
    field: keyof NewTask;
    message: string;
  } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const errorId = useId();
  const fieldProps = (field: keyof NewTask) => ({
    name: field,
    value: task[field],
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      setTask((current) => ({ ...current, [field]: event.target.value }));
      if (error?.field === field) setError(null);
    },
    "aria-invalid": error?.field === field || undefined,
    "aria-describedby": error?.field === field ? errorId : undefined,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = onAdd(task);
    if (!result.ok) {
      setError(result);
      form.current
        ?.querySelector<HTMLElement>(`[name="${result.field}"]`)
        ?.focus();
    }
  };
  const message = (field: keyof NewTask) =>
    error?.field === field ? (
      <span id={errorId} className="field-error" role="alert">
        {error.message}
      </span>
    ) : null;
  return (
    <Modal title="Новая задача" onClose={onClose}>
      <form ref={form} onSubmit={submit} noValidate>
        <label>
          Название <span aria-hidden="true">*</span>
          <input
            {...fieldProps("title")}
            placeholder="Например, утренняя прогулка"
            maxLength={120}
            required
          />
          {message("title")}
        </label>
        <label>
          Описание <span className="optional">необязательно</span>
          <textarea
            {...fieldProps("description")}
            placeholder="Добавьте немного деталей"
            maxLength={300}
            rows={3}
          />
          {message("description")}
        </label>
        <div className="form-row">
          <label>
            Дата <span aria-hidden="true">*</span>
            <input {...fieldProps("date")} type="date" min={today} required />
            {message("date")}
          </label>
          <label>
            Время <span className="optional">необязательно</span>
            <input {...fieldProps("time")} type="time" />
            {message("time")}
          </label>
        </div>
        <button className="submit-button" type="submit">
          <Plus size={19} /> Добавить в планы
        </button>
      </form>
    </Modal>
  );
}
