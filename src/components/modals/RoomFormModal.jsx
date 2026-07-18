// src/components/modals/RoomFormModal.jsx
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "../../supabaseClient";
import Modal from "../common/Modal";
import Field from "../common/Field";

export default function RoomFormModal({ room, contracts, tenants, onClose, onSaved, notify }) {
  const [roomNumber, setRoomNumber] = useState(room?.room_number || "");
  const [rentPrice, setRentPrice] = useState(room?.rent_price || "");
  const [elecPrice, setElecPrice] = useState(room?.electricity_price || "");
  const [waterPrice, setWaterPrice] = useState(room?.water_price || "");
  const [trashPrice, setTrashPrice] = useState(room?.trash_price || "");
  const [saving, setSaving] = useState(false);

  const activeContract = room
    ? contracts?.find((c) => c.room_id === room.id && c.status === "active")
    : null;
  const existingTenants = activeContract
    ? tenants?.filter((t) => t.contract_id === activeContract.id) || []
    : [];

  const [people, setPeople] = useState(
    existingTenants.length > 0
      ? existingTenants.map((t) => ({
          id: t.id,
          full_name: t.full_name,
          phone: t.phone || "",
          id_card: t.id_card || "",
          residence_registration_date: t.residence_registration_date || "",
          is_representative: t.is_representative,
        }))
      : [{ full_name: "", phone: "", id_card: "", residence_registration_date: "", is_representative: true }]
  );

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
    if (!roomNumber.trim()) return notify("Vui lòng nhập tên/số phòng", "error");
    const validPeople = people.filter((p) => p.full_name.trim());

    setSaving(true);

    const roomPayload = {
      room_number: roomNumber,
      rent_price: Number(rentPrice) || 0,
      electricity_price: Number(elecPrice) || 0,
      water_price: Number(waterPrice) || 0,
      trash_price: Number(trashPrice) || 0,
    };
    if (validPeople.length > 0) roomPayload.status = "da_thue";

    let roomId = room?.id;
    if (room) {
      const { error } = await supabase.from("rooms").update(roomPayload).eq("id", room.id);
      if (error) {
        setSaving(false);
        return notify(error.message, "error");
      }
    } else {
      const { data, error } = await supabase.from("rooms").insert(roomPayload).select().single();
      if (error) {
        setSaving(false);
        return notify(error.message, "error");
      }
      roomId = data.id;
    }

    if (validPeople.length > 0) {
      let contractId = activeContract?.id;

      if (!contractId) {
        const { data: contract, error: cErr } = await supabase
          .from("contracts")
          .insert({
            room_id: roomId,
            start_date: new Date().toISOString().slice(0, 10),
            rent_price: Number(rentPrice) || 0,
            status: "active",
          })
          .select()
          .single();
        if (cErr) {
          setSaving(false);
          return notify(cErr.message, "error");
        }
        contractId = contract.id;
      }

      const { error: delErr } = await supabase.from("tenants").delete().eq("contract_id", contractId);
      if (delErr) {
        setSaving(false);
        return notify(delErr.message, "error");
      }

      const tenantRows = validPeople.map((p) => ({
        contract_id: contractId,
        full_name: p.full_name,
        phone: p.phone || null,
        id_card: p.id_card || null,
        residence_registration_date: p.residence_registration_date || null,
        is_representative: p.is_representative,
      }));
      const { error: tErr } = await supabase.from("tenants").insert(tenantRows);
      if (tErr) {
        setSaving(false);
        return notify(tErr.message, "error");
      }
    }

    setSaving(false);
    onSaved();
  };

  return (
    <Modal title={room ? "Sửa thông tin phòng" : "Thêm phòng mới"} onClose={onClose} width={620}>
      <Field label="Tên phòng">
        <input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="P101" />
      </Field>
      <Field label="Giá thuê / tháng (đ)">
        <input type="number" value={rentPrice} onChange={(e) => setRentPrice(e.target.value)} placeholder="2500000" />
      </Field>
      <div className="field-grid-2">
        <Field label="Đơn giá điện (đ/kWh)">
          <input type="number" value={elecPrice} onChange={(e) => setElecPrice(e.target.value)} placeholder="3500" />
        </Field>
        <Field label="Đơn giá nước (đ/m³)">
          <input type="number" value={waterPrice} onChange={(e) => setWaterPrice(e.target.value)} placeholder="20000" />
        </Field>
      </div>
      <Field label="Tiền rác / tháng (đ)">
        <input type="number" value={trashPrice} onChange={(e) => setTrashPrice(e.target.value)} placeholder="30000" />
      </Field>

      <div className="tenant-form-section">
        <div className="row-between">
          <span className="field-label">Khách thuê trong phòng</span>
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
                name="room-form-representative"
                checked={p.is_representative}
                onChange={(e) => updatePerson(idx, "is_representative", e.target.checked)}
              />
              Chủ phòng
            </label>
          </div>
        ))}
        <p className="muted small" style={{ marginTop: 8 }}>
          Để trống tất cả nếu phòng chưa có khách thuê — phòng sẽ ở trạng thái "Phòng trống".
        </p>
      </div>

      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>Hủy</button>
        <button className="btn-primary" onClick={submit} disabled={saving}>
          {saving ? "Đang lưu…" : room ? "Lưu thay đổi" : "Lưu phòng"}
        </button>
      </div>
    </Modal>
  );
}