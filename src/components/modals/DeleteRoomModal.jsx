// src/components/modals/DeleteRoomModal.jsx
import { useState } from "react";
import { supabase } from "../../supabaseClient";
import Modal from "../common/Modal";

export default function DeleteRoomModal({ room, onClose, onDeleted, notify }) {
  const [deleting, setDeleting] = useState(false);

  const submit = async () => {
    setDeleting(true);
    const { error } = await supabase.from("rooms").delete().eq("id", room.id);
    setDeleting(false);
    if (error) return notify(error.message, "error");
    onDeleted();
  };

  return (
    <Modal title="Xóa phòng" onClose={onClose} width={460}>
      <p>
        Bạn chắc chắn muốn xóa phòng <strong>{room.room_number}</strong>?
      </p>
      <p className="muted small" style={{ marginTop: 8 }}>
        Xóa phòng sẽ xóa toàn bộ hợp đồng, người thuê, chỉ số điện nước và hóa đơn liên quan đến
        phòng này. Hành động này không thể hoàn tác.
      </p>
      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>Hủy</button>
        <button className="btn-danger" onClick={submit} disabled={deleting}>
          {deleting ? "Đang xóa…" : "Xóa phòng"}
        </button>
      </div>
    </Modal>
  );
}