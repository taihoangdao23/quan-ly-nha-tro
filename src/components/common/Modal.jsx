// src/components/common/Modal.jsx
import { X } from "lucide-react";

export default function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div 
      className="modal-overlay" 
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="modal-panel" 
        style={{ maxWidth: width }} 
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}