// src/components/common/Toast.jsx
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function Toast({ toasts }) {
  if (!toasts.length) return null;
  
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div 
          key={t.id} 
          className={`toast ${t.type === "error" ? "toast-error" : "toast-ok"}`}
        >
          {t.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}