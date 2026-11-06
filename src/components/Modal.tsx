import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current!;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    element.querySelector<HTMLInputElement>("input")?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex='0']",
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const index = controls.indexOf(document.activeElement as HTMLElement);
        const next =
          (index + (event.shiftKey ? -1 : 1) + controls.length) %
          controls.length;
        event.preventDefault();
        controls[next]?.focus();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.target === event.currentTarget &&
          (event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom)
        )
          onClose();
      }}
    >
      <div className="modal-top">
        <h2 id={titleId}>
          {title}
          <span className="heading-dot">.</span>
        </h2>
        <button className="close-button" onClick={onClose} aria-label="Закрыть">
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
