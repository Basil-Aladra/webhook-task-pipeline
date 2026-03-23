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
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
      />

      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-slate-100 px-4 py-4 shadow-2xl transition-transform duration-300 ease-out xl:max-w-2xl ${className} ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {children}
      </aside>
    </div>
  );
}
