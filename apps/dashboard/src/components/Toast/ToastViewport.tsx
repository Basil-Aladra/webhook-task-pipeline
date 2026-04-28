import { AlertIcon, CheckIcon, InfoIcon, XIcon } from "../Layout/Icons";
import { ToastItem } from "./ToastProvider";

type ToastViewportProps = {
  toasts: ToastItem[];
  onClose: (id: string) => void;
};

function toastClass(type: ToastItem["type"]): string {
  if (type === "success") {
    return "border-emerald-200 bg-white text-emerald-900 shadow-[0_18px_40px_rgba(16,185,129,0.12)]";
  }

  if (type === "error") {
    return "border-red-200 bg-white text-red-900 shadow-[0_18px_40px_rgba(239,68,68,0.12)]";
  }

  return "border-blue-200 bg-white text-blue-900 shadow-[0_18px_40px_rgba(59,130,246,0.12)]";
}

function ToastTypeIcon({ type }: { type: ToastItem["type"] }): JSX.Element {
  if (type === "success") {
    return <CheckIcon className="h-4 w-4" />;
  }

  if (type === "error") {
    return <AlertIcon className="h-4 w-4" />;
  }

  return <InfoIcon className="h-4 w-4" />;
}

export function ToastViewport({ toasts, onClose }: ToastViewportProps): JSX.Element | null {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-[22px] border px-4 py-4 backdrop-blur ${toastClass(toast.type)}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex flex-1 items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-current/10 bg-current/5">
                <ToastTypeIcon type={toast.type} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-current/70">{toast.type}</p>
                <p className="mt-2 text-sm leading-6 text-current">{toast.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onClose(toast.id)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              aria-label="Close notification"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
