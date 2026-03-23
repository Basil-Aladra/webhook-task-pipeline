import { ToastItem } from "./ToastProvider";

type ToastViewportProps = {
  toasts: ToastItem[];
  onClose: (id: string) => void;
};

function toastClass(type: ToastItem["type"]): string {
  if (type === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (type === "error") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
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
          className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-lg ${toastClass(toast.type)}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide">{toast.type}</p>
              <p className="mt-1 text-sm">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onClose(toast.id)}
              className="rounded-md px-2 py-1 text-xs font-medium text-current hover:bg-white/60"
              aria-label="Close notification"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
