import { ReactNode, useEffect } from "react";

type DrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export function Drawer({ isOpen, onClose, children, className = "" }: DrawerProps): JSX.Element {
  const blurActiveElement = () => {
    const activeElement = document.activeElement;

    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      blurActiveElement();
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        blurActiveElement();
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-200 ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Close drawer"
        onClick={() => {
          blurActiveElement();
          onClose();
        }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.28),_rgba(15,23,42,0.58))] backdrop-blur-[6px]"
      />

      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-[820px] overflow-y-auto border-l border-white/10 bg-[linear-gradient(180deg,_rgba(15,23,42,0.16)_0%,_rgba(15,23,42,0.08)_100%)] px-3 py-3 shadow-[0_24px_70px_rgba(15,23,42,0.32)] transition-transform duration-300 ease-out sm:px-4 sm:py-4 ${className} ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="min-h-full rounded-[34px] border border-white/55 bg-[linear-gradient(180deg,_rgba(255,255,255,0.94)_0%,_rgba(248,250,252,0.92)_56%,_rgba(241,245,249,0.92)_100%)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_22px_54px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          {children}
        </div>
      </aside>
    </div>
  );
}
