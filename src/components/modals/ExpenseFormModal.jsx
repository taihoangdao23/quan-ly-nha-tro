// src/components/modals/ExpenseFormModal.jsx
import { useState } from "react";
import { supabase } from "../../supabaseClient";
import Modal from "../common/Modal";
import Field from "../common/Field";

export default function ExpenseFormModal({ rooms, onClose, onSaved, notify }) {
  const [roomId, setRoomId] = useState("");
  const [category, setCategory] = useState("sua_chua");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!amount) return notify("Vui lòng nhập số tiền", "error");
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      room_id: roomId || null,
      category,
      amount: Number(amount),
      expense_date: date,
      note: note || null,
    });
    setSaving(false);
    if (error) return notify(error.message, "error");
    onSaved();
  };

  return (
    <Modal title="Thêm chi phí" onClose={onClose}>
      <Field label="Phòng (tùy chọn)">
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          <option value="">— Không gắn phòng —</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>{r.room_number}</option>
          ))}
        </select>
      </Field>
      <div className="field-grid-2">
        <Field label="Loại chi phí">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="sua_chua">Sửa chữa</option>
            <option value="mua_sam">Mua sắm</option>
            <option value="luong">Lương nhân công</option>
            <option value="khac">Khác</option>
          </select>
        </Field>
        <Field label="Ngày chi">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Số tiền (đ)">
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500000" />
      </Field>
      <Field label="Ghi chú">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Sửa vòi nước phòng 101" />
      </Field>
      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>Hủy</button>
        <button className="btn-primary" onClick={submit} disabled={saving}>
          {saving ? "Đang lưu…" : "Lưu chi phí"}
        </button>
      </div>
    </Modal>
  );
}