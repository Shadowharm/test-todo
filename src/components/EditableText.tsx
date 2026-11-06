import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import type { TaskResult } from "../types";

interface Props {
  value?: string;
  onSave: (value: string) => TaskResult;
  label: string;
  multiline?: boolean;
}

export default function EditableText({
  value,
  onSave,
  label,
  multiline = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [error, setError] = useState("");
  const button = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const errorId = useId();
  useEffect(() => {
    if (!editing && restoreFocus.current) {
      button.current?.focus();
      restoreFocus.current = false;
    }
  }, [editing]);
  const finish = () => {
    const next = draft.trim();
    if (!multiline && !next) {
      setError("Введите название — не только пробелы.");
      return;
    }
    const result = onSave(next);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setEditing(false);
    setError("");
  };
  const onKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      restoreFocus.current = true;
      setError("");
      setEditing(false);
    }
    if (
      event.key === "Enter" &&
      (!multiline || event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      restoreFocus.current = true;
      finish();
    }
  };
  if (editing) {
    const props = {
      autoFocus: true,
      value: draft,
      onChange: (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        setDraft(event.target.value);
        setError("");
      },
      onBlur: finish,
      onKeyDown,
      "aria-label": label,
      "aria-invalid": !!error || undefined,
      "aria-describedby": error ? errorId : undefined,
      maxLength: multiline ? 300 : 120,
      className: `inline-editor ${multiline ? "description-editor" : "title-editor"}`,
    };
    return (
      <>
        {multiline ? <textarea {...props} rows={3} /> : <input {...props} />}
        {error && (
          <span
            id={errorId}
            className="field-error inline-field-error"
            role="alert"
          >
            {error}
          </span>
        )}
      </>
    );
  }
  return (
    <button
      ref={button}
      type="button"
      className={`editable-text ${multiline ? "editable-description" : "editable-title"} ${!value ? "editable-placeholder" : ""}`}
      onClick={() => {
        setDraft(value || "");
        setError("");
        setEditing(true);
      }}
      aria-label={`${label}: ${value || "добавить"}`}
    >
      {value || "Добавить описание"}
    </button>
  );
}
