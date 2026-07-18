// src/components/modals/RoomHistoryModal.jsx
import { useState } from "react";
import { Trash2, History as HistoryIcon } from "lucide-react";
import { supabase } from "../../supabaseClient";
import Modal from "../common/Modal";
import EmptyState from "../common/EmptyState";
import { fmtVND } from "../../utils/helpers";

export default function RoomHistoryModal({ room, invoices, utilityReadings, onClose, onChanged, notify }) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const rows = invoices
    .filter((inv) => inv.room_id === room.id)
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .map((inv) => {
      const reading = utilityReadings.find((u) => u.id === inv.utility_reading_id)
        || utilityReadings.find((u) => u.room_id === room.id && u.month === inv.month && u.year === inv.year);
      return { inv, reading };
    });

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    const { inv, reading } = confirmDelete;
    const { error: iErr } = await supabase.from("invoices").delete().eq("id", inv.id);
    if (reading) {
      await supabase.from("utility_readings").delete().eq("id", reading.id);
    }
    setDeleting(false);
    setConfirmDelete(null);
    if (iErr) return notify(iErr.message, "error");
    notify("Đã xóa bản ghi tháng " + inv.month + "/" + inv.year);
    onChanged();
  };

  const isB3 = room.room_number?.toUpperCase().trim() === "B3";
  const isCompositeRoom = room.room_number?.toUpperCase().trim() === "P2+P3";

  return (
    <Modal title={`Lịch sử chỉ số — Phòng ${room.room_number}`} onClose={onClose} width={720}>
      {rows.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="Chưa có lịch sử hóa đơn" hint="Tạo hóa đơn cho phòng này để bắt đầu ghi nhận" />
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Tháng</th>
                {!isB3 && !isCompositeRoom && <th>Chỉ số điện</th>}
                {isCompositeRoom && <th>P2 Điện</th>}
                {isCompositeRoom && <th>P2 Nước</th>}
                {isCompositeRoom && <th>P3 Điện</th>}
                {isCompositeRoom && <th>P3 Nước</th>}
                {!isCompositeRoom && <th>Chỉ số nước</th>}
                <th>Tổng tiền</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ inv, reading }) => {
                return (
                  <tr key={inv.id}>
                    <td>{inv.month}/{inv.year}</td>
                    {!isB3 && !isCompositeRoom && <td>{reading ? reading.electricity_new : "—"}</td>}
                    {isCompositeRoom && (
                      <>
                        <td>{reading ? `${reading.p2_electricity_old || 0}→${reading.p2_electricity_new || 0}` : "—"}</td>
                        <td>{reading ? `${reading.p2_water_old || 0}→${reading.p2_water_new || 0}` : "—"}</td>
                        <td>{reading ? `${reading.p3_electricity_old || 0}→${reading.p3_electricity_new || 0}` : "—"}</td>
                        <td>{reading ? `${reading.p3_water_old || 0}→${reading.p3_water_new || 0}` : "—"}</td>
                      </>
                    )}
                    {!isCompositeRoom && <td>{reading ? reading.water_new : "—"}</td>}
                    <td><strong>{fmtVND(inv.total_amount)}</strong></td>
                    <td>
                      <button className="icon-btn icon-btn-danger" onClick={() => setConfirmDelete({ inv, reading })}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmDelete && (
        <div className="inline-confirm">
          <p>
            Xóa bản ghi tháng <strong>{confirmDelete.inv.month}/{confirmDelete.inv.year}</strong>?
            Hành động này không thể hoàn tác.
          </p>
          <div className="inline-confirm-actions">
            <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Hủy</button>
            <button className="btn-danger" onClick={doDelete} disabled={deleting}>
              {deleting ? "Đang xóa…" : "Xóa"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}