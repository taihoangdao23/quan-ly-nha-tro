// src/components/modals/InvoiceFormModal.jsx
import { useState, useEffect, useRef } from "react";
import { Zap, Droplet } from "lucide-react";
import { supabase } from "../../supabaseClient";
import Modal from "../common/Modal";
import Field from "../common/Field";
import InvoiceReceiptModal from "./InvoiceReceiptModal";
import { MONTHS, YEARS, THIS_YEAR } from "../../constants";
import { roundToThousand, fmtVND } from "../../utils/helpers";

export default function InvoiceFormModal({ rooms, presetRoomId, utilityReadings, existingInvoice, onClose, onSaved, notify }) {
  const isEdit = !!existingInvoice;
  const existingReading = isEdit
    ? utilityReadings?.find((u) => u.id === existingInvoice.utility_reading_id)
    : null;

  const [roomId, setRoomId] = useState(existingInvoice?.room_id || presetRoomId || "");
  const [month, setMonth] = useState(existingInvoice?.month || new Date().getMonth() + 1);
  const [year, setYear] = useState(existingInvoice?.year || THIS_YEAR);

  // State cho phòng thường
  const [elecOld, setElecOld] = useState(existingReading ? String(existingReading.electricity_old) : "");
  const [elecNew, setElecNew] = useState(existingReading ? String(existingReading.electricity_new) : "");
  const [waterOld, setWaterOld] = useState(existingReading ? String(existingReading.water_old) : "");
  const [waterNew, setWaterNew] = useState(existingReading ? String(existingReading.water_new) : "");
  const [waterSubtract, setWaterSubtract] = useState(existingReading ? String(existingReading.water_subtract || 0) : "");

  // State cho phòng P2+P3
  const [p2ElecOld, setP2ElecOld] = useState("");
  const [p2ElecNew, setP2ElecNew] = useState("");
  const [p2WaterOld, setP2WaterOld] = useState("");
  const [p2WaterNew, setP2WaterNew] = useState("");
  const [p3ElecOld, setP3ElecOld] = useState("");
  const [p3ElecNew, setP3ElecNew] = useState("");
  const [p3WaterOld, setP3WaterOld] = useState("");
  const [p3WaterNew, setP3WaterNew] = useState("");

  const [otherAmount, setOtherAmount] = useState(existingInvoice?.other_amount || "");
  const [otherNote, setOtherNote] = useState(existingInvoice?.other_note || "");
  const [saving, setSaving] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);

  const room = rooms.find((r) => r.id === roomId);
  const isB3 = room?.room_number?.toUpperCase().trim() === "B3";
  const isCompositeRoom = room?.room_number?.toUpperCase().trim() === "P2+P3";

  // Tự động điền số cũ
  useEffect(() => {
    if (isEdit) return;
    if (!roomId || !utilityReadings || isCompositeRoom) return;
    
    const readingsOfRoom = utilityReadings
      .filter((u) => u.room_id === roomId)
      .sort((a, b) => b.year - a.year || b.month - a.month);
    const latest = readingsOfRoom[0];
    if (latest) {
      if (!isB3) setElecOld(String(latest.electricity_new || 0));
      setWaterOld(String(latest.water_new || 0));
      if (isB3) setWaterSubtract(String(latest.water_subtract || 0));
    }
  }, [roomId, utilityReadings, isEdit, isB3, isCompositeRoom]);

  useEffect(() => {
    if (isEdit) return;
    if (!isCompositeRoom || !roomId || !utilityReadings) return;
    
    const readings = utilityReadings
      .filter((u) => u.room_id === roomId)
      .sort((a, b) => b.year - a.year || b.month - a.month);
    
    if (readings.length > 0) {
      const latest = readings[0];
      setP2ElecOld(String(latest.p2_electricity_new || latest.electricity_new || 0));
      setP2WaterOld(String(latest.p2_water_new || latest.water_new || 0));
      setP3ElecOld(String(latest.p3_electricity_new || 0));
      setP3WaterOld(String(latest.p3_water_new || 0));
    }
  }, [roomId, utilityReadings, isEdit, isCompositeRoom]);

  // Tính toán
  const elecUsed = isB3 ? 0 : Math.max(0, Number(elecNew || 0) - Number(elecOld || 0));
  let waterUsed = 0;
  if (isB3) {
    waterUsed = Math.max(0, Number(waterNew || 0) - Number(waterOld || 0) - Number(waterSubtract || 0));
  } else {
    waterUsed = Math.max(0, Number(waterNew || 0) - Number(waterOld || 0));
  }
  
  const elecAmount = room && !isB3 ? elecUsed * Number(room.electricity_price) : 0;
  const waterAmount = room ? waterUsed * Number(room.water_price) : 0;

  const p2ElecUsed = Math.max(0, Number(p2ElecNew || 0) - Number(p2ElecOld || 0));
  const p2WaterUsed = Math.max(0, Number(p2WaterNew || 0) - Number(p2WaterOld || 0));
  const p2ElecAmount = room ? p2ElecUsed * Number(room.electricity_price) : 0;
  const p2WaterAmount = room ? p2WaterUsed * Number(room.water_price) : 0;

  const p3ElecUsed = Math.max(0, Number(p3ElecNew || 0) - Number(p3ElecOld || 0));
  const p3WaterUsed = Math.max(0, Number(p3WaterNew || 0) - Number(p3WaterOld || 0));
  const p3ElecAmount = room ? p3ElecUsed * Number(room.electricity_price) : 0;
  const p3WaterAmount = room ? p3WaterUsed * Number(room.water_price) : 0;

  const totalElecAmount = isCompositeRoom ? p2ElecAmount + p3ElecAmount : elecAmount;
  const totalWaterAmount = isCompositeRoom ? p2WaterAmount + p3WaterAmount : waterAmount;

  const rentAmount = room ? Number(room.rent_price) : 0;
  const trashAmount = room ? Number(room.trash_price) : 0;
  const rawTotal = rentAmount + totalElecAmount + totalWaterAmount + trashAmount + Number(otherAmount || 0);
  const total = roundToThousand(rawTotal);

  const submit = async () => {
    if (!roomId) return notify("Vui lòng chọn phòng", "error");

    // Validate
    if (!isCompositeRoom && !isB3) {
      if (Number(elecNew) < Number(elecOld)) {
        return notify("Chỉ số điện mới phải lớn hơn hoặc bằng chỉ số cũ", "error");
      }
    }
    
    if (isB3) {
      if (Number(waterNew) - Number(waterOld) - Number(waterSubtract) < 0) {
        return notify("Chỉ số nước tiêu thụ không được âm", "error");
      }
    } else if (!isCompositeRoom) {
      if (Number(waterNew) < Number(waterOld)) {
        return notify("Chỉ số nước mới phải lớn hơn hoặc bằng chỉ số cũ", "error");
      }
    }

    if (isCompositeRoom) {
      if (Number(p2ElecNew) < Number(p2ElecOld)) return notify("Chỉ số điện mới P2 phải lớn hơn hoặc bằng chỉ số cũ", "error");
      if (Number(p2WaterNew) < Number(p2WaterOld)) return notify("Chỉ số nước mới P2 phải lớn hơn hoặc bằng chỉ số cũ", "error");
      if (Number(p3ElecNew) < Number(p3ElecOld)) return notify("Chỉ số điện mới P3 phải lớn hơn hoặc bằng chỉ số cũ", "error");
      if (Number(p3WaterNew) < Number(p3WaterOld)) return notify("Chỉ số nước mới P3 phải lớn hơn hoặc bằng chỉ số cũ", "error");
    }

    setSaving(true);

    let readingPayload;
    if (isCompositeRoom) {
      readingPayload = {
        room_id: roomId,
        month,
        year,
        p2_electricity_old: Number(p2ElecOld) || 0,
        p2_electricity_new: Number(p2ElecNew) || 0,
        p2_water_old: Number(p2WaterOld) || 0,
        p2_water_new: Number(p2WaterNew) || 0,
        p3_electricity_old: Number(p3ElecOld) || 0,
        p3_electricity_new: Number(p3ElecNew) || 0,
        p3_water_old: Number(p3WaterOld) || 0,
        p3_water_new: Number(p3WaterNew) || 0,
        electricity_old: Number(p2ElecOld) || 0,
        electricity_new: Number(p2ElecNew) || 0,
        water_old: Number(p2WaterOld) || 0,
        water_new: Number(p2WaterNew) || 0,
      };
    } else {
      readingPayload = {
        room_id: roomId,
        month,
        year,
        electricity_old: isB3 ? 0 : Number(elecOld) || 0,
        electricity_new: isB3 ? 0 : Number(elecNew) || 0,
        water_old: Number(waterOld) || 0,
        water_new: Number(waterNew) || 0,
        water_subtract: isB3 ? Number(waterSubtract) || 0 : 0,
      };
    }

    const { data: reading, error: rErr } = await supabase
      .from("utility_readings")
      .upsert(readingPayload, { onConflict: "room_id,month,year" })
      .select()
      .single();

    if (rErr) {
      setSaving(false);
      return notify(rErr.message, "error");
    }

    const invoicePayload = {
      room_id: roomId,
      utility_reading_id: reading.id,
      month,
      year,
      rent_amount: rentAmount,
      electricity_amount: totalElecAmount,
      water_amount: totalWaterAmount,
      trash_amount: trashAmount,
      other_amount: Number(otherAmount) || 0,
      other_note: otherNote || null,
      total_amount: total,
    };

    if (!isEdit) invoicePayload.status = "chua_thanh_toan";

    let invoiceQuery;
    if (isEdit) {
      invoiceQuery = supabase.from("invoices").update(invoicePayload).eq("id", existingInvoice.id).select().single();
    } else {
      invoiceQuery = supabase
        .from("invoices")
        .upsert(invoicePayload, { onConflict: "room_id,month,year" })
        .select()
        .single();
    }
    const { data: invoice, error: iErr } = await invoiceQuery;

    setSaving(false);
    if (iErr) return notify(iErr.message, "error");

    if (isEdit) {
      onSaved();
      return;
    }

    const receiptData = {
      ...invoice,
      room_number: room?.room_number,
      isB3,
      isCompositeRoom,
      elec_old: isB3 ? 0 : Number(elecOld) || 0,
      elec_new: isB3 ? 0 : Number(elecNew) || 0,
      elec_used: elecUsed,
      water_old: Number(waterOld) || 0,
      water_new: Number(waterNew) || 0,
      water_used: waterUsed,
      water_subtract: isB3 ? Number(waterSubtract) || 0 : 0,
      p2_elec_old: Number(p2ElecOld) || 0,
      p2_elec_new: Number(p2ElecNew) || 0,
      p2_elec_used: p2ElecUsed,
      p2_water_old: Number(p2WaterOld) || 0,
      p2_water_new: Number(p2WaterNew) || 0,
      p2_water_used: p2WaterUsed,
      p3_elec_old: Number(p3ElecOld) || 0,
      p3_elec_new: Number(p3ElecNew) || 0,
      p3_elec_used: p3ElecUsed,
      p3_water_old: Number(p3WaterOld) || 0,
      p3_water_new: Number(p3WaterNew) || 0,
      p3_water_used: p3WaterUsed,
      total_elec_amount: totalElecAmount,
      total_water_amount: totalWaterAmount,
      electricity_price: room?.electricity_price || 0,
      water_price: room?.water_price || 0,
    };

    setCreatedInvoice(receiptData);
  };

  if (createdInvoice) {
    return (
      <InvoiceReceiptModal
        invoice={createdInvoice}
        onClose={() => onSaved()}
      />
    );
  }

  return (
    <Modal title={isEdit ? "Sửa hóa đơn" : "Tạo hóa đơn tháng"} onClose={onClose} width={isCompositeRoom ? 720 : 560}>
      <div className="modal-form">
        <Field label="Phòng">
          {isEdit ? (
            <input value={room?.room_number || ""} disabled />
          ) : (
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">— Chọn phòng —</option>
              {rooms.filter((r) => r.status === "da_thue").map((r) => (
                <option key={r.id} value={r.id}>{r.room_number}</option>
              ))}
            </select>
          )}
        </Field>

        <div className="field-grid-2">
          <Field label="Tháng">
            {isEdit ? (
              <input value={`Tháng ${month}`} disabled />
            ) : (
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
              </select>
            )}
          </Field>
          <Field label="Năm">
            {isEdit ? (
              <input value={year} disabled />
            ) : (
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </Field>
        </div>

        {/* Phòng thường */}
        {!isCompositeRoom && !isB3 && (
          <div className="utility-section">
            <p className="field-label"><Zap size={14} className="inline-icon" /> Chỉ số điện (kWh)</p>
            <div className="field-grid-2">
              <Field label="Số cũ"><input type="number" value={elecOld} onChange={(e) => setElecOld(e.target.value)} placeholder="0" /></Field>
              <Field label="Số mới"><input type="number" value={elecNew} onChange={(e) => setElecNew(e.target.value)} placeholder="0" /></Field>
            </div>
          </div>
        )}

        {/* Chỉ số nước */}
        {!isCompositeRoom && (
          <div className="utility-section" style={{ 
            background: isB3 ? '#fefce8' : 'var(--blue-50)',
            border: isB3 ? '2px solid #eab308' : 'none'
          }}>
            <p className="field-label">
              <Droplet size={14} className="inline-icon" /> 
              Chỉ số nước (m³)
              {isB3 && <span style={{ marginLeft: '8px', color: '#eab308', fontSize: '12px', fontWeight: 'bold' }}>⭐ Có trừ</span>}
            </p>
            
            {isB3 ? (
              <>
                <div className="field-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <Field label="Số cũ">
                    <input type="number" value={waterOld} onChange={(e) => setWaterOld(e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Số mới">
                    <input type="number" value={waterNew} onChange={(e) => setWaterNew(e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Trừ">
                    <input type="number" value={waterSubtract} onChange={(e) => setWaterSubtract(e.target.value)} placeholder="0" style={{ borderColor: '#eab308', background: '#fefce8' }} />
                  </Field>
                </div>
                <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--ink-600)' }}>
                  <strong>Công thức:</strong> Số mới - Số cũ - Trừ = {Math.max(0, Number(waterNew || 0) - Number(waterOld || 0) - Number(waterSubtract || 0)).toFixed(1)} m³
                </div>
              </>
            ) : (
              <div className="field-grid-2">
                <Field label="Số cũ"><input type="number" value={waterOld} onChange={(e) => setWaterOld(e.target.value)} placeholder="0" /></Field>
                <Field label="Số mới"><input type="number" value={waterNew} onChange={(e) => setWaterNew(e.target.value)} placeholder="0" /></Field>
              </div>
            )}
          </div>
        )}

        {/* Phòng P2+P3 */}
        {isCompositeRoom && (
          <>
            <div className="composite-room-section" style={{ border: '1px solid var(--blue-100)', borderRadius: '10px', padding: '16px', marginBottom: '16px', background: 'var(--blue-50)' }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--blue-600)' }}>📋 Phòng P2</h4>
              <div className="utility-section" style={{ background: 'white' }}>
                <p className="field-label"><Zap size={14} className="inline-icon" /> Chỉ số điện P2 (kWh)</p>
                <div className="field-grid-2">
                  <Field label="Số cũ"><input type="number" value={p2ElecOld} onChange={(e) => setP2ElecOld(e.target.value)} placeholder="0" style={{ background: '#f0f7ff' }} /></Field>
                  <Field label="Số mới"><input type="number" value={p2ElecNew} onChange={(e) => setP2ElecNew(e.target.value)} placeholder="0" /></Field>
                </div>
              </div>
              <div className="utility-section" style={{ background: 'white' }}>
                <p className="field-label"><Droplet size={14} className="inline-icon" /> Chỉ số nước P2 (m³)</p>
                <div className="field-grid-2">
                  <Field label="Số cũ"><input type="number" value={p2WaterOld} onChange={(e) => setP2WaterOld(e.target.value)} placeholder="0" style={{ background: '#f0f7ff' }} /></Field>
                  <Field label="Số mới"><input type="number" value={p2WaterNew} onChange={(e) => setP2WaterNew(e.target.value)} placeholder="0" /></Field>
                </div>
              </div>
            </div>

            <div className="composite-room-section" style={{ border: '1px solid var(--green-bg)', borderRadius: '10px', padding: '16px', marginBottom: '16px', background: 'var(--green-bg)' }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--green)' }}>📋 Phòng P3</h4>
              <div className="utility-section" style={{ background: 'white' }}>
                <p className="field-label"><Zap size={14} className="inline-icon" /> Chỉ số điện P3 (kWh)</p>
                <div className="field-grid-2">
                  <Field label="Số cũ"><input type="number" value={p3ElecOld} onChange={(e) => setP3ElecOld(e.target.value)} placeholder="0" style={{ background: '#f0f7ff' }} /></Field>
                  <Field label="Số mới"><input type="number" value={p3ElecNew} onChange={(e) => setP3ElecNew(e.target.value)} placeholder="0" /></Field>
                </div>
              </div>
              <div className="utility-section" style={{ background: 'white' }}>
                <p className="field-label"><Droplet size={14} className="inline-icon" /> Chỉ số nước P3 (m³)</p>
                <div className="field-grid-2">
                  <Field label="Số cũ"><input type="number" value={p3WaterOld} onChange={(e) => setP3WaterOld(e.target.value)} placeholder="0" style={{ background: '#f0f7ff' }} /></Field>
                  <Field label="Số mới"><input type="number" value={p3WaterNew} onChange={(e) => setP3WaterNew(e.target.value)} placeholder="0" /></Field>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="field-grid-2">
          <Field label="Phụ thu khác (đ)">
            <input type="number" value={otherAmount} onChange={(e) => setOtherAmount(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Ghi chú phụ thu">
            <input value={otherNote} onChange={(e) => setOtherNote(e.target.value)} placeholder="VD: internet, sửa chữa" />
          </Field>
        </div>

        {room && (
          <div className="invoice-preview">
            <div className="row-between"><span className="muted">Tiền phòng</span><span>{fmtVND(rentAmount)}</span></div>
            
            {isCompositeRoom ? (
              <>
                <div style={{ paddingLeft: '12px', borderLeft: '3px solid var(--blue-100)', margin: '4px 0' }}>
                  <div className="row-between"><span className="muted">P2 - Điện ({p2ElecUsed} kWh)</span><span>{fmtVND(p2ElecAmount)}</span></div>
                  <div className="row-between"><span className="muted">P2 - Nước ({p2WaterUsed} m³)</span><span>{fmtVND(p2WaterAmount)}</span></div>
                  <div className="row-between"><span className="muted">P3 - Điện ({p3ElecUsed} kWh)</span><span>{fmtVND(p3ElecAmount)}</span></div>
                  <div className="row-between"><span className="muted">P3 - Nước ({p3WaterUsed} m³)</span><span>{fmtVND(p3WaterAmount)}</span></div>
                </div>
                <div className="row-between" style={{ borderTop: '1px dashed var(--line)', paddingTop: '6px' }}>
                  <span className="muted">Tổng điện + nước</span>
                  <span>{fmtVND(totalElecAmount + totalWaterAmount)}</span>
                </div>
              </>
            ) : (
              <>
                {!isB3 && (
                  <div className="row-between"><span className="muted">Điện ({elecUsed} kWh)</span><span>{fmtVND(elecAmount)}</span></div>
                )}
                <div className="row-between">
                  <span className="muted">
                    Nước 
                    {isB3 ? ` (${waterOld} → ${waterNew}, trừ ${waterSubtract || 0}, dùng ${waterUsed} m³)` : ` (${waterUsed} m³)`}
                  </span>
                  <span>{fmtVND(waterAmount)}</span>
                </div>
              </>
            )}
            
            <div className="row-between"><span className="muted">Tiền rác</span><span>{fmtVND(trashAmount)}</span></div>
            {Number(otherAmount) > 0 && (
              <div className="row-between"><span className="muted">{otherNote || "Phụ thu khác"}</span><span>{fmtVND(otherAmount)}</span></div>
            )}
            {rawTotal !== total && (
              <div className="row-between"><span className="muted small">Trước khi làm tròn</span><span className="muted small">{fmtVND(rawTotal)}</span></div>
            )}
            <div className="invoice-total row-between"><strong>Tổng (đã làm tròn)</strong><strong>{fmtVND(total)}</strong></div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Hủy</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Tạo hóa đơn"}
          </button>
        </div>
      </div>
    </Modal>
  );
}