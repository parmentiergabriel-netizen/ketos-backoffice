import { createContext, ReactNode, useCallback, useContext, useRef, useState } from "react";
import { Icon } from "./Icon";

type Kind = "success" | "error" | "info";
type ToastInput = { kind?: Kind; message: string; action?: { label: string; run: () => void }; duration?: number; onExpire?: () => void };
type Toast = ToastInput & { id: number; leaving?: boolean };

const ToastContext = createContext<(t: ToastInput) => void>(() => {});
export const useToast = () => useContext(ToastContext);

const ICONS: Record<Kind, "check" | "x" | "info"> = { success: "check", error: "x", info: "info" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  // onExpire n'est appelé que si l'action (ex. « Annuler ») n'a pas été utilisée.
  const expiries = useRef(new Map<number, () => void>());

  const close = useCallback((id: number) => {
    setToasts(ts => ts.map(t => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 300);
  }, []);

  const push = useCallback((input: ToastInput) => {
    const id = ++seq.current;
    const duration = input.duration ?? 3500;
    setToasts(ts => [...ts.slice(-3), { kind: "success", ...input, id, duration }]);
    if (input.onExpire) expiries.current.set(id, input.onExpire);
    setTimeout(() => {
      const expire = expiries.current.get(id);
      expiries.current.delete(id);
      expire?.();
      close(id);
    }, duration);
  }, [close]);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.kind} ${t.leaving ? "out" : ""}`}>
            <span className="ti"><Icon name={ICONS[t.kind ?? "success"]} size={14} /></span>
            <span className="msg">{t.message}</span>
            {t.action && (
              <button onClick={() => { expiries.current.delete(t.id); t.action!.run(); close(t.id); }}>{t.action.label}</button>
            )}
            <span className="bar" style={{ animationDuration: `${t.duration}ms` }} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
