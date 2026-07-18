// src/components/modals/ContractFormModal.jsx
import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "../../supabaseClient";
import Modal from "../common/Modal";
import Field from "../common/Field";

export default function ContractFormModal({ rooms, onClose, onSaved, notify }) {
  const [roomId, setRoomId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [deposit, setDeposit] = useState("");
  const [rentPrice, setRentPrice] = useState("");
  const [people, setPeople] = useState([
    { full_name: "", phone: "", id_card: "", residence_registration_date: "", is_representative: true },
  ]);
  const [saving, setSaving] = useState(false);

  const availableRooms = rooms.filter((r) => r.status === "trong");

  useEffect(() => {
    const room = rooms.find((r) => r.id === roomId);
    if (room) setRentPrice(room.rent_price);
  }, [roomId, rooms]);

  const addPerson = () =>
    setPeople((p) => [
      ...p,
      { full_name: "", phone: "", id_card: "", residence_registration_date: "", is_representative: false },
    ]);
  const removePerson = (idx) => setPeople((p) => p.filter((_, i) => i !== idx));
  const updatePerson = (idx, field, value) =>
    setPeople((p) =>
      p.map((per, i) => {
        if (field === "is_representative" && value) {
          return { ...per, is_representative: i === idx };
        }
        return i === idx ? { ...per, [field]: value } : per;
      })
    );

  const submit = async () => {
    if (!roomId) return notify("Vui lòng chọn phòng", "error");
    const validPeople = people.filter((p) => p.full_name.trim());
    if (validPeople.length === 0) return notify("Vui lòng nhập ít nhất 1 người thuê", "error");

    setSaving(true);
    const { data: contract, error: cErr } = await supabase
      .from("contracts")
      .insert({
        room_id: roomId,
        start_date: startDate,
        deposit: Number(deposit) || 0,
        rent_price: Number(rentPrice) || 0,
        status: "active",
      })
      .select()
      .single();

    if (cErr) {
      setSaving(false);
      return notify(cErr.message, "error");
    }

    const tenantRows = validPeople.map((p) => ({
      contract_id: contract.id,
      full_name: p.full_name,
      phone: p.phone || null,
      id_card: p.id_card || null,
      residence_registration_date: p.residence_registration_date || null,
      is_representative: p.is_representative,
    }));
    const { error: tErr } = await supabase.from("tenants").insert(tenantRows);
    const { error: rErr } = await supabase.from("rooms").update({ status: "da_thue" }).eq("id", roomId);

    setSaving(false);
    if (tErr || rErr) return notify((tErr || rErr).message, "error");
    onSaved();
  };

  return (
    <Modal title="Lập hợp đồng thuê mới" onClose={onClose} width={620}>
      <Field label="Phòng trống">
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          <option value="">— Chọn phòng —</option>
          {availableRooms.map((r) => (
            <option key={r.id} value={r.id}>{r.room_number}</option>
          ))}
        </select>
      </Field>

      <div className="field-grid-2">
        <Field label="Ngày bắt đầu">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="Tiền cọc (đ)">
          <input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="2500000" />
        </Field>
      </div>

      <Field label="Giá thuê / tháng (đ)">
        <input type="number" value={rentPrice} onChange={(e) => setRentPrice(e.target.value)} />
      </Field>

      <div className="tenant-form-section">
        <div className="row-between">
          <span className="field-label">Người thuê trong phòng</span>
          <button className="btn-ghost-sm" onClick={addPerson} type="button">
            <Plus size={14} /> Thêm người
          </button>
        </div>
        {people.map((p, idx) => (
          <div key={idx} className="tenant-card">
            <div className="tenant-card-row">
              <input
                placeholder="Họ tên"
                value={p.full_name}
                onChange={(e) => updatePerson(idx, "full_name", e.target.value)}
              />
              <input
                placeholder="SĐT"
                value={p.phone}
                onChange={(e) => updatePerson(idx, "phone", e.target.value)}
              />
              {people.length > 1 && (
                <button className="icon-btn" onClick={() => removePerson(idx)} type="button">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="tenant-card-row">
              <input
                placeholder="CCCD"
                value={p.id_card}
                onChange={(e) => updatePerson(idx, "id_card", e.target.value)}
              />
              <div className="tenant-date-field">
                <span className="tenant-date-label">Ngày đăng ký tạm trú</span>
                <input
                  type="date"
                  value={p.residence_registration_date}
                  onChange={(e) => updatePerson(idx, "residence_registration_date", e.target.value)}
                />
              </div>
            </div>
            <label className="checkbox-inline">
              <input
                type="radio"
                name="contract-form-representative"
                checked={p.is_representative}
                onChange={(e) => updatePerson(idx, "is_representative", e.target.checked)}
              />
              Đại diện
            </label>
          </div>
        ))}
      </div>

      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>Hủy</button>
        <button className="btn-primary" onClick={submit} disabled={saving}>
          {saving ? "Đang lưu…" : "Lập hợp đồng"}
        </button>
      </div>
    </Modal>
  );
}