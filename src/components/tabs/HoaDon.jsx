// src/components/tabs/HoaDon.jsx
import { useState } from "react";
import { Plus, Receipt, Zap, Droplet, CheckCircle2, Pencil, Trash2, Filter, Calendar } from "lucide-react";
import { supabase } from "../../supabaseClient";
import Badge from "../common/Badge";
import EmptyState from "../common/EmptyState";
import Modal from "../common/Modal";
import InvoiceFormModal from "../modals/InvoiceFormModal";
import { MONTHS, YEARS, THIS_YEAR } from "../../constants";
import { fmtVND, fmtDate } from "../../utils/helpers";

export default function HoaDon({ rooms, invoices, utilityReadings, loadAll, notify }) {
  const [showModal, setShowModal] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [deleteInvoice, setDeleteInvoice] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(THIS_YEAR);

  const filtered = invoices.filter((i) => i.month === filterMonth && i.year === filterYear);
  const totalAmount = filtered.reduce((sum, i) => sum + Number(i.total_amount), 0);
  const paidCount = filtered.filter(i => i.status === "da_thanh_toan").length;

  const markPaid = async (invoice) => {
    const { error } = await supabase
      .from("invoices")
      .update({ status: "da_thanh_toan", paid_date: new Date().toISOString().slice(0, 10) })
      .eq("id", invoice.id);
    if (error) return notify(error.message, "error");
    await supabase.from("payments").insert({ invoice_id: invoice.id, amount: invoice.total_amount, method: "tien_mat" });
    loadAll();
    notify("Đã đánh dấu thanh toán");
  };

  const confirmDeleteInvoice = async () => {
    if (!deleteInvoice) return;
    setDeleting(true);
    const { error } = await supabase.from("invoices").delete().eq("id", deleteInvoice.id);
    if (deleteInvoice.utility_reading_id) {
      await supabase.from("utility_readings").delete().eq("id", deleteInvoice.utility_reading_id);
    }
    setDeleting(false);
    setDeleteInvoice(null);
    if (error) return notify(error.message, "error");
    loadAll();
    notify("Đã xóa hóa đơn");
  };

  return (
    <div className="page">
      <header className="page-head row-between">
        <div>
          <h1>📄 Hóa đơn</h1>
          <p>Tính tiền điện, nước và tiền phòng theo tháng</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Tạo hóa đơn
        </button>
      </header>

      <div className="filter-bar">
        <div className="filter-group">
          <Filter size={16} />
          <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))}>
            {MONTHS.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
          </select>
          <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="filter-stats">
          <span>Tổng: <strong>{fmtVND(totalAmount)}</strong></span>
          <span>Đã thu: <strong className="text-green">{paidCount}/{filtered.length}</strong></span>
        </div>
      </div>

      <div className="invoice-list">
        {filtered.map((inv) => {
          const room = rooms.find((r) => r.id === inv.room_id);
          const isB3 = room?.room_number?.toUpperCase().trim() === "B3";
          const isCompositeRoom = room?.room_number?.toUpperCase().trim() === "P2+P3";
          return (
            <div key={inv.id} className="invoice-card">
              <div className="invoice-card-head">
                <div>
                  <p className="invoice-room">Phòng {room?.room_number}</p>
                  <p className="invoice-date"><Calendar size={14} /> Tháng {inv.month}/{inv.year}</p>
                </div>
                <Badge status={inv.status} />
              </div>
              <div className="invoice-breakdown">
                <div className="row-between"><span className="muted">Tiền phòng</span><span>{fmtVND(inv.rent_amount)}</span></div>
                {!isB3 && !isCompositeRoom && (
                  <div className="row-between"><span className="muted"><Zap size={13} className="inline-icon" /> Điện</span><span>{fmtVND(inv.electricity_amount)}</span></div>
                )}
                {isCompositeRoom && (
                  <>
                    <div className="row-between sub-item"><span className="muted">P2 - Điện + Nước</span><span>{fmtVND(inv.electricity_amount / 2)}</span></div>
                    <div className="row-between sub-item"><span className="muted">P3 - Điện + Nước</span><span>{fmtVND(inv.electricity_amount / 2)}</span></div>
                  </>
                )}
                {!isCompositeRoom && (
                  <div className="row-between"><span className="muted"><Droplet size={13} className="inline-icon" /> Nước</span><span>{fmtVND(inv.water_amount)}</span></div>
                )}
                <div className="row-between"><span className="muted">Tiền rác</span><span>{fmtVND(inv.trash_amount)}</span></div>
                {Number(inv.other_amount) > 0 && (
                  <div className="row-between"><span className="muted">{inv.other_note || "Khác"}</span><span>{fmtVND(inv.other_amount)}</span></div>
                )}
                <div className="invoice-total row-between">
                  <strong>Tổng cộng</strong>
                  <strong>{fmtVND(inv.total_amount)}</strong>
                </div>
              </div>
              {inv.status === "chua_thanh_toan" && (
                <button className="btn-secondary full-width" onClick={() => markPaid(inv)}>
                  <CheckCircle2 size={15} /> Đánh dấu đã thanh toán
                </button>
              )}
              {inv.status === "da_thanh_toan" && (
                <p className="muted small text-center">✅ Đã thu ngày {fmtDate(inv.paid_date)}</p>
              )}
              <div className="invoice-card-actions">
                <button className="btn-ghost-sm" onClick={() => setEditInvoice(inv)}><Pencil size={14} /> Sửa</button>
                <button className="btn-ghost-sm btn-ghost-danger" onClick={() => setDeleteInvoice(inv)}><Trash2 size={14} /> Xóa</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <EmptyState icon={Receipt} title="Chưa có hóa đơn cho tháng này" hint="Tạo hóa đơn để tính tiền điện nước" />
        )}
      </div>

      {showModal && (
        <InvoiceFormModal rooms={rooms} utilityReadings={utilityReadings} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); loadAll(); notify("Đã tạo hóa đơn"); }} notify={notify} />
      )}
      {editInvoice && (
        <InvoiceFormModal rooms={rooms} utilityReadings={utilityReadings} existingInvoice={editInvoice} onClose={() => setEditInvoice(null)} onSaved={() => { setEditInvoice(null); loadAll(); notify("Đã cập nhật hóa đơn"); }} notify={notify} />
      )}
      {deleteInvoice && (
        <Modal title="Xóa hóa đơn" onClose={() => setDeleteInvoice(null)} width={440}>
          <p>Xóa hóa đơn tháng <strong>{deleteInvoice.month}/{deleteInvoice.year}</strong> của phòng <strong>{rooms.find((r) => r.id === deleteInvoice.room_id)?.room_number}</strong>?</p>
          <p className="muted small" style={{ marginTop: 8 }}>Hành động này không thể hoàn tác.</p>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setDeleteInvoice(null)}>Hủy</button>
            <button className="btn-danger" onClick={confirmDeleteInvoice} disabled={deleting}>
              {deleting ? "Đang xóa…" : "Xóa hóa đơn"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}