// src/components/common/EmptyState.jsx
export default function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="empty-state">
      <Icon size={28} strokeWidth={1.5} />
      <p className="empty-title">{title}</p>
      {hint && <p className="empty-hint">{hint}</p>}
    </div>
  );
}