import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { Task } from "../types";
import { dateKey } from "../utils/dates";

interface DragState {
  id: string;
  card: HTMLElement;
  rect: DOMRect;
  startX: number;
  startY: number;
  preview: HTMLElement | null;
  target: string | null;
}

export function useTaskDrag(moveTask: (id: string, date: string) => void) {
  const dragRef = useRef<DragState | null>(null);
  useEffect(
    () => () => {
      dragRef.current?.preview?.remove();
      dragRef.current?.card.classList.remove("drag-source");
    },
    [],
  );
  const [dropDate, setDropDate] = useState<string | null>(null);
  const startDrag = (event: PointerEvent<HTMLSpanElement>, task: Task) => {
    if (
      event.button !== 0 ||
      (event.target as Element).closest("button, input, label")
    )
      return;
    const handle = event.currentTarget;
    const card = handle.closest(".task-card");
    if (!(card instanceof HTMLElement)) return;
    const rect = card.getBoundingClientRect();
    dragRef.current = {
      id: task.id,
      card,
      rect,
      startX: event.clientX,
      startY: event.clientY,
      preview: null,
      target: null,
    };
    handle.setPointerCapture(event.pointerId);
  };
  const updateDrag = (event: PointerEvent<HTMLSpanElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    // Порог отличает перетаскивание от случайного движения при нажатии.
    if (!drag.preview && Math.hypot(dx, dy) < 5) return;
    if (!drag.preview) {
      // Своя копия сохраняет скругления вместо стандартного изображения браузера.
      const preview = drag.card.cloneNode(true) as HTMLElement;
      preview.classList.add("drag-preview");
      preview.inert = true;
      preview.setAttribute("aria-hidden", "true");
      if (drag.card.closest(".featured"))
        preview.classList.add("preview-featured");
      if (drag.card.closest(".overdue"))
        preview.classList.add("preview-overdue");
      Object.assign(preview.style, {
        width: `${drag.rect.width}px`,
        height: `${drag.rect.height}px`,
        left: `${drag.rect.left}px`,
        top: `${drag.rect.top}px`,
      });
      document.body.appendChild(preview);
      drag.preview = preview;
      drag.card.classList.add("drag-source");
    }
    drag.preview.style.transform = `translate(${dx}px, ${dy}px)`;
    const day = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-drop-date]");
    const target = day?.dataset.dropDate;
    drag.target = target && target >= dateKey(new Date()) ? target : null;
    setDropDate(drag.target);
  };
  const endDrag = (event: PointerEvent<HTMLSpanElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.preview?.remove();
    drag.card.classList.remove("drag-source");
    dragRef.current = null;
    if (event.type !== "pointercancel" && drag.preview && drag.target)
      moveTask(drag.id, drag.target);
    setDropDate(null);
  };
  return { dropDate, startDrag, updateDrag, endDrag };
}
