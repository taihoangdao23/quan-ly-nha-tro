import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "./supabaseClient";
import {
  Home,
  Building2,
  Users,
  Receipt,
  Wallet,
  Plus,
  X,
  Search,
  Zap,
  Droplet,
  CheckCircle2,
  Circle,
  Trash2,
  Pencil,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from "lucide-react";

// ============================================================
// HẰNG SỐ / HELPERS
// ============================================================
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];

const fmtVND = (n) =>
  (Number(n) || 0).toLocaleString("vi-VN", { maximumFractionDigits: 0 }) + " đ";

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("vi-VN");
};

const STATUS_LABEL = {
  trong: { text: "Phòng trống", className: "badge-empty" },
  da_thue: { text: "Đã thuê", className: "badge-rented" },
  chua_thanh_toan: { text: "Chưa thanh toán", className: "badge-unpaid" },
  da_thanh_toan: { text: "Đã thanh toán", className: "badge-paid" },
};

// ============================================================
// UI PRIMITIVES
// ============================================================
function Badge({ status }) {
  const info = STATUS_LABEL[status] || { text: status, className: "" };
  return <span className={`badge ${info.className}`}>{info.text}</span>;
}

function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
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

function Field({ label, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="empty-state">
      <Icon size={28} strokeWidth={1.5} />
      <p className="empty-title">{title}</p>
      {hint && <p className="empty-hint">{hint}</p>}
    </div>
  );
}

function Toast({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type === "error" ? "toast-error" : "toast-ok"}`}>
          {t.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// APP
// ============================================================
export default function App() {
  const [tab, setTab] = useState("tongquan");
  const [houses, setHouses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((message, type = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [h, r, c, t, i, e] = await Promise.all([
      supabase.from("houses").select("*").order("created_at"),
      supabase.from("rooms").select("*").order("room_number"),
      supabase.from("contracts").select("*").order("created_at", { ascending: false }),
      supabase.from("tenants").select("*"),
      supabase.from("invoices").select("*").order("year", { ascending: false }).order("month", { ascending: false }),
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
    ]);
    if (h.error) notify("Không tải được dữ liệu nhà: " + h.error.message, "error");
    setHouses(h.data || []);
    setRooms(r.data || []);
    setContracts(c.data || []);
    setTenants(t.data || []);
    setInvoices(i.data || []);
    setExpenses(e.data || []);
    setLoading(false);
  }, [notify]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const ctx = { houses, rooms, contracts, tenants, invoices, expenses, loadAll, notify };

  const NAV = [
    { key: "tongquan", label: "Tổng quan", shortLabel: "Tổng quan", icon: Home },
    { key: "nha", label: "Nhà & phòng", shortLabel: "Nhà/phòng", icon: Building2 },
    { key: "khach", label: "Khách thuê", shortLabel: "Khách", icon: Users },
    { key: "hoadon", label: "Hóa đơn", shortLabel: "Hóa đơn", icon: Receipt },
    { key: "thuchi", label: "Thu chi", shortLabel: "Thu chi", icon: Wallet },
  ];

  return (
    <div className="app-shell">
      <style>{CSS}</style>

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">TT</div>
          <div className="brand-text">
            <strong>Trọ Tốt</strong>
            <span>Quản lý nhà trọ</span>
          </div>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.key}
              className={`nav-item ${tab === n.key ? "active" : ""}`}
              onClick={() => setTab(n.key)}
            >
              <n.icon size={18} strokeWidth={1.8} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <p>3 nhà trọ · {rooms.length} phòng</p>
        </div>
      </aside>

      <main className="main">
        {loading ? (
          <div className="loading-screen">Đang tải dữ liệu…</div>
        ) : (
          <>
            {tab === "tongquan" && <TongQuan {...ctx} />}
            {tab === "nha" && <NhaPhong {...ctx} />}
            {tab === "khach" && <KhachThue {...ctx} />}
            {tab === "hoadon" && <HoaDon {...ctx} />}
            {tab === "thuchi" && <ThuChi {...ctx} />}
          </>
        )}
      </main>

      <nav className="bottom-nav">
        {NAV.map((n) => (
          <button
            key={n.key}
            className={`bottom-nav-item ${tab === n.key ? "active" : ""}`}
            onClick={() => setTab(n.key)}
          >
            <n.icon size={20} strokeWidth={tab === n.key ? 2.2 : 1.8} />
            <span>{n.shortLabel}</span>
          </button>
        ))}
      </nav>

      <Toast toasts={toasts} />
    </div>
  );
}

// ============================================================
// TAB: TỔNG QUAN
// ============================================================
function TongQuan({ rooms, contracts, invoices, expenses }) {
  const occupied = rooms.filter((r) => r.status === "da_thue").length;
  const empty = rooms.length - occupied;
  const unpaid = invoices.filter((i) => i.status === "chua_thanh_toan");
  const unpaidTotal = unpaid.reduce((s, i) => s + Number(i.total_amount), 0);

  const now = new Date();
  const thisMonthInvoices = invoices.filter(
    (i) => i.month === now.getMonth() + 1 && i.year === now.getFullYear()
  );
  const collected = thisMonthInvoices
    .filter((i) => i.status === "da_thanh_toan")
    .reduce((s, i) => s + Number(i.total_amount), 0);
  const expectedThisMonth = thisMonthInvoices.reduce((s, i) => s + Number(i.total_amount), 0);

  const thisMonthExpenses = expenses
    .filter((e) => {
      const d = new Date(e.expense_date);
      return d.getMonth() + 1 === now.getMonth() + 1 && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="page">
      <header className="page-head">
        <h1>Tổng quan</h1>
        <p>Tình hình nhà trọ tháng {now.getMonth() + 1}/{now.getFullYear()}</p>
      </header>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue"><Building2 size={18} /></div>
          <div>
            <p className="stat-label">Tổng số phòng</p>
            <p className="stat-value">{rooms.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><CheckCircle2 size={18} /></div>
          <div>
            <p className="stat-label">Đang thuê</p>
            <p className="stat-value">{occupied}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-grey"><Circle size={18} /></div>
          <div>
            <p className="stat-label">Phòng trống</p>
            <p className="stat-value">{empty}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-red"><AlertCircle size={18} /></div>
          <div>
            <p className="stat-label">Hóa đơn chưa thu</p>
            <p className="stat-value">{fmtVND(unpaidTotal)}</p>
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h3>Thu trong tháng</h3>
          <div className="row-between">
            <span className="muted">Đã thu</span>
            <strong className="text-green">{fmtVND(collected)}</strong>
          </div>
          <div className="row-between">
            <span className="muted">Dự kiến tổng</span>
            <strong>{fmtVND(expectedThisMonth)}</strong>
          </div>
          <div className="row-between">
            <span className="muted">Chi phí trong tháng</span>
            <strong className="text-red">{fmtVND(thisMonthExpenses)}</strong>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${expectedThisMonth ? Math.min(100, (collected / expectedThisMonth) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="panel">
          <h3>Phòng còn trống</h3>
          <div className="house-mini-list">
            {rooms.filter((r) => r.status === "trong").map((r) => (
              <div key={r.id} className="house-mini-row">
                <div>
                  <p className="house-mini-name">{r.room_number}</p>
                </div>
                <span className="pill">{fmtVND(r.rent_price)}</span>
              </div>
            ))}
            {empty === 0 && <p className="muted small">Tất cả phòng đều đã có khách thuê.</p>}
          </div>
        </div>
      </div>

      {unpaid.length > 0 && (
        <div className="panel">
          <h3>Hóa đơn chưa thanh toán ({unpaid.length})</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Phòng</th>
                <th>Tháng</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {unpaid.slice(0, 6).map((inv) => {
                const room = rooms.find((r) => r.id === inv.room_id);
                return (
                  <tr key={inv.id}>
                    <td>{room?.room_number || "—"}</td>
                    <td>{inv.month}/{inv.year}</td>
                    <td>{fmtVND(inv.total_amount)}</td>
                    <td><Badge status={inv.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB: NHÀ & PHÒNG
// ============================================================
function NhaPhong({ rooms, contracts, tenants, loadAll, notify }) {
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [deleteRoom, setDeleteRoom] = useState(null);

  return (
    <div className="page">
      <header className="page-head row-between">
        <div>
          <h1>Nhà & phòng</h1>
          <p>Danh sách tất cả các phòng đang quản lý</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditRoom(null);
            setShowRoomModal(true);
          }}
        >
          <Plus size={16} /> Thêm phòng
        </button>
      </header>

      <div className="room-grid">
        {rooms.map((room) => {
          const activeContract = contracts.find((c) => c.room_id === room.id && c.status === "active");
          const people = activeContract ? tenants.filter((t) => t.contract_id === activeContract.id) : [];
          return (
            <div key={room.id} className="room-card">
              <div className="room-card-head">
                <span className="room-number">{room.room_number}</span>
                <Badge status={room.status} />
              </div>
              <div className="room-card-body">
                <div className="row-between">
                  <span className="muted">Giá thuê</span>
                  <strong>{fmtVND(room.rent_price)}</strong>
                </div>
                <div className="row-between">
                  <span className="muted"><Zap size={13} className="inline-icon" /> Điện</span>
                  <span>{fmtVND(room.electricity_price)}/kWh</span>
                </div>
                <div className="row-between">
                  <span className="muted"><Droplet size={13} className="inline-icon" /> Nước</span>
                  <span>{fmtVND(room.water_price)}/m³</span>
                </div>
                <div className="row-between">
                  <span className="muted">Tiền rác</span>
                  <span>{fmtVND(room.trash_price)}/tháng</span>
                </div>
                {people.length > 0 && (
                  <div className="tenant-chip-list room-card-tenants">
                    {people.map((p) => (
                      <span key={p.id} className={`tenant-chip ${p.is_representative ? "tenant-chip-rep" : ""}`}>
                        {p.full_name}{p.is_representative ? " · chủ phòng" : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="room-card-actions">
                <button
                  className="btn-ghost-sm"
                  onClick={() => {
                    setEditRoom(room);
                    setShowRoomModal(true);
                  }}
                >
                  <Pencil size={14} /> Sửa
                </button>
                <button className="btn-ghost-sm btn-ghost-danger" onClick={() => setDeleteRoom(room)}>
                  <Trash2 size={14} /> Xóa
                </button>
              </div>
            </div>
          );
        })}
        {rooms.length === 0 && (
          <EmptyState icon={Home} title="Chưa có phòng nào" hint="Thêm phòng đầu tiên để bắt đầu quản lý" />
        )}
      </div>

      {showRoomModal && (
        <RoomFormModal
          room={editRoom}
          contracts={contracts}
          tenants={tenants}
          onClose={() => setShowRoomModal(false)}
          onSaved={() => {
            setShowRoomModal(false);
            loadAll();
            notify(editRoom ? "Đã cập nhật phòng" : "Đã thêm phòng mới");
          }}
          notify={notify}
        />
      )}

      {deleteRoom && (
        <DeleteRoomModal
          room={deleteRoom}
          onClose={() => setDeleteRoom(null)}
          onDeleted={() => {
            setDeleteRoom(null);
            loadAll();
            notify("Đã xóa phòng");
          }}
          notify={notify}
        />
      )}
    </div>
  );
}

function DeleteRoomModal({ room, onClose, onDeleted, notify }) {
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

function RoomFormModal({ room, contracts, tenants, onClose, onSaved, notify }) {
  const [roomNumber, setRoomNumber] = useState(room?.room_number || "");
  const [floor, setFloor] = useState(room?.floor || "");
  const [area, setArea] = useState(room?.area || "");
  const [rentPrice, setRentPrice] = useState(room?.rent_price || "");
  const [elecPrice, setElecPrice] = useState(room?.electricity_price || "");
  const [waterPrice, setWaterPrice] = useState(room?.water_price || "");
  const [trashPrice, setTrashPrice] = useState(room?.trash_price || "");
  const [saving, setSaving] = useState(false);

  // Hợp đồng đang active của phòng này (nếu là sửa phòng đã có khách)
  const activeContract = room
    ? contracts?.find((c) => c.room_id === room.id && c.status === "active")
    : null;
  const existingTenants = activeContract
    ? tenants?.filter((t) => t.contract_id === activeContract.id) || []
    : [];

  // Danh sách người thuê đang nhập trong form
  const [people, setPeople] = useState(
    existingTenants.length > 0
      ? existingTenants.map((t) => ({
          id: t.id,
          full_name: t.full_name,
          phone: t.phone || "",
          id_card: t.id_card || "",
          is_representative: t.is_representative,
        }))
      : [{ full_name: "", phone: "", id_card: "", is_representative: true }]
  );

  const addPerson = () =>
    setPeople((p) => [...p, { full_name: "", phone: "", id_card: "", is_representative: false }]);
  const removePerson = (idx) => setPeople((p) => p.filter((_, i) => i !== idx));
  const updatePerson = (idx, field, value) =>
    setPeople((p) =>
      p.map((per, i) => {
        if (field === "is_representative" && value) {
          // chỉ 1 người được là chủ phòng tại 1 thời điểm
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
      floor: floor || null,
      area: area ? Number(area) : null,
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

    // Nếu có người thuê nhập vào, tạo/cập nhật hợp đồng + danh sách người
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

      // Xóa hết người thuê cũ của hợp đồng này rồi ghi lại danh sách mới
      // (đơn giản và an toàn hơn so với so khớp từng dòng đã sửa/xóa/thêm)
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
      <div className="field-grid-2">
        <Field label="Tên phòng">
          <input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="P101" />
        </Field>
        <Field label="Tầng">
          <input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="1" />
        </Field>
      </div>
      <Field label="Diện tích (m²)">
        <input type="number" value={area} onChange={(e) => setArea(e.target.value)} placeholder="20" />
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
          <div key={idx} className="tenant-row">
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
            <input
              placeholder="CCCD"
              value={p.id_card}
              onChange={(e) => updatePerson(idx, "id_card", e.target.value)}
            />
            <label className="checkbox-inline">
              <input
                type="radio"
                name="room-form-representative"
                checked={p.is_representative}
                onChange={(e) => updatePerson(idx, "is_representative", e.target.checked)}
              />
              Chủ phòng
            </label>
            {people.length > 1 && (
              <button className="icon-btn" onClick={() => removePerson(idx)} type="button">
                <Trash2 size={14} />
              </button>
            )}
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

// ============================================================
// TAB: KHÁCH THUÊ
// ============================================================
function KhachThue({ rooms, contracts, tenants, loadAll, notify }) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const rows = contracts
    .map((c) => {
      const room = rooms.find((r) => r.id === c.room_id);
      const people = tenants.filter((t) => t.contract_id === c.id);
      return { contract: c, room, people };
    })
    .filter((row) => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        row.room?.room_number?.toLowerCase().includes(s) ||
        row.people.some((p) => p.full_name.toLowerCase().includes(s))
      );
    });

  return (
    <div className="page">
      <header className="page-head row-between">
        <div>
          <h1>Khách thuê</h1>
          <p>Hợp đồng và danh sách người ở theo từng phòng</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Lập hợp đồng mới
        </button>
      </header>

      <div className="search-bar">
        <Search size={16} />
        <input
          placeholder="Tìm theo tên khách, số phòng…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="contract-list">
        {rows.map(({ contract, room, people }) => (
          <div key={contract.id} className="contract-card">
            <div className="contract-card-head">
              <div>
                <p className="contract-room">Phòng {room?.room_number}</p>
                <p className="muted small">
                  Hợp đồng từ {fmtDate(contract.start_date)}
                  {contract.end_date ? ` đến ${fmtDate(contract.end_date)}` : ""}
                </p>
              </div>
              <Badge status={contract.status === "active" ? "da_thue" : "trong"} />
            </div>
            <div className="contract-meta">
              <span className="muted">Giá thuê: <strong>{fmtVND(contract.rent_price)}</strong></span>
              <span className="muted">Cọc: <strong>{fmtVND(contract.deposit)}</strong></span>
            </div>
            <div className="tenant-chip-list">
              {people.map((p) => (
                <span key={p.id} className={`tenant-chip ${p.is_representative ? "tenant-chip-rep" : ""}`}>
                  {p.full_name}
                  {p.is_representative ? " · đại diện" : ""}
                </span>
              ))}
              {people.length === 0 && <span className="muted small">Chưa có người ở</span>}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <EmptyState icon={Users} title="Chưa có hợp đồng nào" hint="Lập hợp đồng mới để thêm khách thuê" />
        )}
      </div>

      {showModal && (
        <ContractFormModal
          rooms={rooms}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            loadAll();
            notify("Đã lập hợp đồng mới");
          }}
          notify={notify}
        />
      )}
    </div>
  );
}

function ContractFormModal({ rooms, onClose, onSaved, notify }) {
  const [roomId, setRoomId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [deposit, setDeposit] = useState("");
  const [rentPrice, setRentPrice] = useState("");
  const [people, setPeople] = useState([{ full_name: "", phone: "", id_card: "", is_representative: true }]);
  const [saving, setSaving] = useState(false);

  const availableRooms = rooms.filter((r) => r.status === "trong");

  useEffect(() => {
    const room = rooms.find((r) => r.id === roomId);
    if (room) setRentPrice(room.rent_price);
  }, [roomId, rooms]);

  const addPerson = () =>
    setPeople((p) => [...p, { full_name: "", phone: "", id_card: "", is_representative: false }]);
  const removePerson = (idx) => setPeople((p) => p.filter((_, i) => i !== idx));
  const updatePerson = (idx, field, value) =>
    setPeople((p) => p.map((per, i) => (i === idx ? { ...per, [field]: value } : per)));

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
          <div key={idx} className="tenant-row">
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
            <input
              placeholder="CCCD"
              value={p.id_card}
              onChange={(e) => updatePerson(idx, "id_card", e.target.value)}
            />
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={p.is_representative}
                onChange={(e) => updatePerson(idx, "is_representative", e.target.checked)}
              />
              Đại diện
            </label>
            {people.length > 1 && (
              <button className="icon-btn" onClick={() => removePerson(idx)} type="button">
                <Trash2 size={14} />
              </button>
            )}
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

// ============================================================
// TAB: HÓA ĐƠN
// ============================================================
function HoaDon({ rooms, invoices, loadAll, notify }) {
  const [showModal, setShowModal] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(THIS_YEAR);

  const filtered = invoices.filter((i) => i.month === filterMonth && i.year === filterYear);

  const markPaid = async (invoice) => {
    const { error } = await supabase
      .from("invoices")
      .update({ status: "da_thanh_toan", paid_date: new Date().toISOString().slice(0, 10) })
      .eq("id", invoice.id);
    if (error) return notify(error.message, "error");
    await supabase.from("payments").insert({
      invoice_id: invoice.id,
      amount: invoice.total_amount,
      method: "tien_mat",
    });
    loadAll();
    notify("Đã đánh dấu thanh toán");
  };

  return (
    <div className="page">
      <header className="page-head row-between">
        <div>
          <h1>Hóa đơn</h1>
          <p>Tính tiền điện, nước và tiền phòng theo tháng</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Tạo hóa đơn
        </button>
      </header>

      <div className="filter-bar">
        <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))}>
          {MONTHS.map((m) => (
            <option key={m} value={m}>Tháng {m}</option>
          ))}
        </select>
        <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))}>
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="invoice-list">
        {filtered.map((inv) => {
          const room = rooms.find((r) => r.id === inv.room_id);
          return (
            <div key={inv.id} className="invoice-card">
              <div className="invoice-card-head">
                <div>
                  <p className="contract-room">Phòng {room?.room_number}</p>
                  <p className="muted small">Tháng {inv.month}/{inv.year}</p>
                </div>
                <Badge status={inv.status} />
              </div>
              <div className="invoice-breakdown">
                <div className="row-between"><span className="muted">Tiền phòng</span><span>{fmtVND(inv.rent_amount)}</span></div>
                <div className="row-between"><span className="muted"><Zap size={13} className="inline-icon" /> Điện</span><span>{fmtVND(inv.electricity_amount)}</span></div>
                <div className="row-between"><span className="muted"><Droplet size={13} className="inline-icon" /> Nước</span><span>{fmtVND(inv.water_amount)}</span></div>
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
                <p className="muted small text-center">Đã thu ngày {fmtDate(inv.paid_date)}</p>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <EmptyState icon={Receipt} title="Chưa có hóa đơn cho tháng này" hint="Tạo hóa đơn để tính tiền điện nước" />
        )}
      </div>

      {showModal && (
        <InvoiceFormModal
          rooms={rooms}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            loadAll();
            notify("Đã tạo hóa đơn");
          }}
          notify={notify}
        />
      )}
    </div>
  );
}

function InvoiceFormModal({ rooms, onClose, onSaved, notify }) {
  const [roomId, setRoomId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(THIS_YEAR);
  const [elecOld, setElecOld] = useState("");
  const [elecNew, setElecNew] = useState("");
  const [waterOld, setWaterOld] = useState("");
  const [waterNew, setWaterNew] = useState("");
  const [otherAmount, setOtherAmount] = useState("");
  const [otherNote, setOtherNote] = useState("");
  const [saving, setSaving] = useState(false);

  const occupiedRooms = rooms.filter((r) => r.status === "da_thue");
  const room = rooms.find((r) => r.id === roomId);

  const elecUsed = Math.max(0, Number(elecNew || 0) - Number(elecOld || 0));
  const waterUsed = Math.max(0, Number(waterNew || 0) - Number(waterOld || 0));
  const elecAmount = room ? elecUsed * Number(room.electricity_price) : 0;
  const waterAmount = room ? waterUsed * Number(room.water_price) : 0;
  const rentAmount = room ? Number(room.rent_price) : 0;
  const trashAmount = room ? Number(room.trash_price) : 0;
  const total = rentAmount + elecAmount + waterAmount + trashAmount + Number(otherAmount || 0);

  const submit = async () => {
    if (!roomId) return notify("Vui lòng chọn phòng", "error");
    if (Number(elecNew) < Number(elecOld) || Number(waterNew) < Number(waterOld)) {
      return notify("Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ", "error");
    }
    setSaving(true);

    const { data: reading, error: rErr } = await supabase
      .from("utility_readings")
      .upsert(
        {
          room_id: roomId,
          month,
          year,
          electricity_old: Number(elecOld) || 0,
          electricity_new: Number(elecNew) || 0,
          water_old: Number(waterOld) || 0,
          water_new: Number(waterNew) || 0,
        },
        { onConflict: "room_id,month,year" }
      )
      .select()
      .single();

    if (rErr) {
      setSaving(false);
      return notify(rErr.message, "error");
    }

    const { error: iErr } = await supabase.from("invoices").upsert(
      {
        room_id: roomId,
        utility_reading_id: reading.id,
        month,
        year,
        rent_amount: rentAmount,
        electricity_amount: elecAmount,
        water_amount: waterAmount,
        trash_amount: trashAmount,
        other_amount: Number(otherAmount) || 0,
        other_note: otherNote || null,
        total_amount: total,
        status: "chua_thanh_toan",
      },
      { onConflict: "room_id,month,year" }
    );

    setSaving(false);
    if (iErr) return notify(iErr.message, "error");
    onSaved();
  };

  return (
    <Modal title="Tạo hóa đơn tháng" onClose={onClose} width={560}>
      <Field label="Phòng">
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          <option value="">— Chọn phòng —</option>
          {occupiedRooms.map((r) => <option key={r.id} value={r.id}>{r.room_number}</option>)}
        </select>
      </Field>

      <div className="field-grid-2">
        <Field label="Tháng">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
          </select>
        </Field>
        <Field label="Năm">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
      </div>

      <div className="utility-section">
        <p className="field-label"><Zap size={14} className="inline-icon" /> Chỉ số điện (kWh)</p>
        <div className="field-grid-2">
          <Field label="Số cũ"><input type="number" value={elecOld} onChange={(e) => setElecOld(e.target.value)} /></Field>
          <Field label="Số mới"><input type="number" value={elecNew} onChange={(e) => setElecNew(e.target.value)} /></Field>
        </div>
      </div>

      <div className="utility-section">
        <p className="field-label"><Droplet size={14} className="inline-icon" /> Chỉ số nước (m³)</p>
        <div className="field-grid-2">
          <Field label="Số cũ"><input type="number" value={waterOld} onChange={(e) => setWaterOld(e.target.value)} /></Field>
          <Field label="Số mới"><input type="number" value={waterNew} onChange={(e) => setWaterNew(e.target.value)} /></Field>
        </div>
      </div>

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
          <div className="row-between"><span className="muted">Điện ({elecUsed} kWh)</span><span>{fmtVND(elecAmount)}</span></div>
          <div className="row-between"><span className="muted">Nước ({waterUsed} m³)</span><span>{fmtVND(waterAmount)}</span></div>
          <div className="row-between"><span className="muted">Tiền rác</span><span>{fmtVND(trashAmount)}</span></div>
          {Number(otherAmount) > 0 && (
            <div className="row-between"><span className="muted">{otherNote || "Phụ thu khác"}</span><span>{fmtVND(otherAmount)}</span></div>
          )}
          <div className="invoice-total row-between"><strong>Tổng</strong><strong>{fmtVND(total)}</strong></div>
        </div>
      )}

      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>Hủy</button>
        <button className="btn-primary" onClick={submit} disabled={saving}>
          {saving ? "Đang lưu…" : "Tạo hóa đơn"}
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// TAB: THU CHI
// ============================================================
function ThuChi({ rooms, invoices, expenses, loadAll, notify }) {
  const [showModal, setShowModal] = useState(false);

  const totalIncome = invoices
    .filter((i) => i.status === "da_thanh_toan")
    .reduce((s, i) => s + Number(i.total_amount), 0);
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const combined = useMemo(() => {
    const incomeRows = invoices
      .filter((i) => i.status === "da_thanh_toan")
      .map((i) => {
        const room = rooms.find((r) => r.id === i.room_id);
        return {
          type: "income",
          date: i.paid_date,
          label: `Tiền phòng ${room?.room_number || ""} — Tháng ${i.month}/${i.year}`,
          amount: i.total_amount,
        };
      });
    const expenseRows = expenses.map((e) => ({
      type: "expense",
      date: e.expense_date,
      label: e.note || e.category,
      amount: e.amount,
    }));
    return [...incomeRows, ...expenseRows].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [invoices, expenses, rooms]);

  return (
    <div className="page">
      <header className="page-head row-between">
        <div>
          <h1>Thu chi</h1>
          <p>Tổng hợp các khoản thu từ tiền phòng và chi phí vận hành</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Thêm chi phí
        </button>
      </header>

      <div className="stat-grid stat-grid-3">
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><TrendingUp size={18} /></div>
          <div>
            <p className="stat-label">Tổng thu</p>
            <p className="stat-value text-green">{fmtVND(totalIncome)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-red"><TrendingDown size={18} /></div>
          <div>
            <p className="stat-label">Tổng chi</p>
            <p className="stat-value text-red">{fmtVND(totalExpense)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue"><Wallet size={18} /></div>
          <div>
            <p className="stat-label">Lợi nhuận</p>
            <p className="stat-value">{fmtVND(totalIncome - totalExpense)}</p>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Lịch sử giao dịch</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Nội dung</th>
              <th>Loại</th>
              <th>Số tiền</th>
            </tr>
          </thead>
          <tbody>
            {combined.map((row, idx) => (
              <tr key={idx}>
                <td>{fmtDate(row.date)}</td>
                <td>{row.label}</td>
                <td>
                  <span className={row.type === "income" ? "tag-income" : "tag-expense"}>
                    {row.type === "income" ? "Thu" : "Chi"}
                  </span>
                </td>
                <td className={row.type === "income" ? "text-green" : "text-red"}>
                  {row.type === "income" ? "+" : "-"}{fmtVND(row.amount)}
                </td>
              </tr>
            ))}
            {combined.length === 0 && (
              <tr><td colSpan={4}><EmptyState icon={Wallet} title="Chưa có giao dịch nào" /></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ExpenseFormModal
          rooms={rooms}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            loadAll();
            notify("Đã ghi nhận chi phí");
          }}
          notify={notify}
        />
      )}
    </div>
  );
}

function ExpenseFormModal({ rooms, onClose, onSaved, notify }) {
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

// ============================================================
// CSS — Hiện đại tối giản, nền trắng + xanh, nhiều khoảng trống
// ============================================================
const CSS = `
:root {
  --blue-50: #f0f6ff;
  --blue-100: #dbeafe;
  --blue-500: #2563eb;
  --blue-600: #1d4ed8;
  --ink-900: #0f172a;
  --ink-600: #475569;
  --ink-400: #94a3b8;
  --line: #e6eaf0;
  --green: #16a34a;
  --green-bg: #ecfdf3;
  --red: #dc2626;
  --red-bg: #fef2f2;
  --grey-bg: #f1f5f9;
  --radius: 14px;
  --shadow: 0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.04);
}

* { box-sizing: border-box; }

.app-shell {
  display: flex;
  min-height: 100vh;
  background: #fafbfc;
  font-family: "Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--ink-900);
}

/* ---------- SIDEBAR ---------- */
.sidebar {
  width: 232px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
}
.brand { display: flex; align-items: center; gap: 10px; padding: 0 8px 24px; }
.brand-mark {
  width: 36px; height: 36px; border-radius: 10px;
  background: linear-gradient(135deg, var(--blue-500), #4f9cf9);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 13px; letter-spacing: 0.5px;
}
.brand-text { display: flex; flex-direction: column; line-height: 1.2; }
.brand-text strong { font-size: 15px; }
.brand-text span { font-size: 12px; color: var(--ink-400); }
.nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  border: none; background: transparent;
  color: var(--ink-600); font-size: 14px; font-weight: 500;
  cursor: pointer; text-align: left; transition: background 0.15s, color 0.15s;
}
.nav-item:hover { background: var(--blue-50); color: var(--blue-600); }
.nav-item.active { background: var(--blue-500); color: #fff; }
.sidebar-foot { padding: 12px 8px 0; border-top: 1px solid var(--line); margin-top: 12px; }
.sidebar-foot p { font-size: 12px; color: var(--ink-400); }

/* ---------- MAIN ---------- */
.main { flex: 1; padding: 36px 40px; max-width: 1180px; }
.loading-screen { color: var(--ink-400); font-size: 14px; padding: 60px 0; text-align: center; }
.page-head { margin-bottom: 28px; }
.page-head h1 { font-size: 26px; font-weight: 700; margin: 4px 0 4px; letter-spacing: -0.02em; }
.page-head p { color: var(--ink-600); font-size: 14px; margin: 0; }
.row-between { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 6px 0; }
.link-back {
  display: inline-flex; align-items: center; gap: 6px;
  border: none; background: none; color: var(--blue-600);
  font-size: 13px; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 6px;
}

/* ---------- BUTTONS ---------- */
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--blue-500); color: #fff; border: none;
  padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.btn-primary:hover { background: var(--blue-600); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  display: inline-flex; align-items: center; gap: 6px; justify-content: center;
  background: #fff; color: var(--ink-900); border: 1px solid var(--line);
  padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer;
}
.btn-secondary:hover { background: var(--grey-bg); }
.btn-ghost-sm {
  display: inline-flex; align-items: center; gap: 4px;
  background: transparent; border: none; color: var(--blue-600);
  font-size: 13px; font-weight: 600; cursor: pointer; padding: 4px 6px; border-radius: 6px;
}
.btn-ghost-sm:hover { background: var(--blue-50); }
.full-width { width: 100%; margin-top: 10px; }
.icon-btn {
  border: none; background: transparent; color: var(--ink-400);
  cursor: pointer; padding: 6px; border-radius: 8px; display: inline-flex;
}
.icon-btn:hover { background: var(--grey-bg); color: var(--ink-900); }

/* ---------- STAT CARDS ---------- */
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
.stat-grid-3 { grid-template-columns: repeat(3, 1fr); }
.stat-card {
  background: #fff; border: 1px solid var(--line); border-radius: var(--radius);
  padding: 18px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow);
}
.stat-icon {
  width: 38px; height: 38px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.stat-icon-blue { background: var(--blue-50); color: var(--blue-600); }
.stat-icon-green { background: var(--green-bg); color: var(--green); }
.stat-icon-red { background: var(--red-bg); color: var(--red); }
.stat-icon-grey { background: var(--grey-bg); color: var(--ink-600); }
.stat-label { font-size: 12.5px; color: var(--ink-400); margin: 0 0 2px; }
.stat-value { font-size: 19px; font-weight: 700; margin: 0; }

/* ---------- PANELS ---------- */
.two-col { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; margin-bottom: 20px; }
.panel {
  background: #fff; border: 1px solid var(--line); border-radius: var(--radius);
  padding: 20px; box-shadow: var(--shadow); margin-bottom: 16px;
}
.panel h3 { font-size: 14.5px; font-weight: 700; margin: 0 0 14px; }
.progress-track { height: 6px; background: var(--grey-bg); border-radius: 6px; margin-top: 10px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--blue-500); border-radius: 6px; }
.house-mini-list { display: flex; flex-direction: column; gap: 10px; }
.house-mini-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--line); }
.house-mini-row:last-child { border-bottom: none; padding-bottom: 0; }
.house-mini-name { font-size: 13.5px; font-weight: 600; margin: 0; }
.house-mini-addr { font-size: 12px; color: var(--ink-400); margin: 2px 0 0; }

/* ---------- TABLE ---------- */
.table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.table th { text-align: left; color: var(--ink-400); font-weight: 600; font-size: 12px; padding: 8px 10px; border-bottom: 1px solid var(--line); }
.table td { padding: 10px 10px; border-bottom: 1px solid var(--line); }
.table tr:last-child td { border-bottom: none; }

/* ---------- BADGES / PILLS ---------- */
.badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 100px; font-size: 12px; font-weight: 600; }
.badge-empty { background: var(--grey-bg); color: var(--ink-600); }
.badge-rented { background: var(--blue-50); color: var(--blue-600); }
.badge-unpaid { background: var(--red-bg); color: var(--red); }
.badge-paid { background: var(--green-bg); color: var(--green); }
.pill { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 100px; background: var(--grey-bg); color: var(--ink-600); }
.pill-green { background: var(--green-bg); color: var(--green); }

/* ---------- HOUSES & ROOMS ---------- */
.house-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.house-card {
  background: #fff; border: 1px solid var(--line); border-radius: var(--radius);
  box-shadow: var(--shadow); transition: border-color 0.15s; overflow: hidden;
}
.house-card:hover { border-color: var(--blue-500); }
.house-card-clickable {
  width: 100%; text-align: left; background: none; border: none; cursor: pointer;
  padding: 20px; display: block; font: inherit; color: inherit;
}
.house-card-top { display: flex; align-items: center; justify-content: space-between; color: var(--blue-600); margin-bottom: 10px; }
.house-card h3 { font-size: 16px; margin: 0 0 4px; }
.house-card-foot { display: flex; gap: 8px; margin-top: 14px; }
.house-card-actions {
  display: flex; gap: 4px; padding: 8px 14px; border-top: 1px solid var(--line); background: #fafbfc;
}
.btn-ghost-danger { color: var(--red); }
.btn-ghost-danger:hover { background: var(--red-bg); }
.btn-danger {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--red); color: #fff; border: none;
  padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer;
}
.btn-danger:hover { background: #b91c1c; }
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

.room-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.room-card { background: #fff; border: 1px solid var(--line); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow); }
.room-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.room-number { font-size: 15px; font-weight: 700; }
.room-card-body { display: flex; flex-direction: column; gap: 6px; font-size: 13.5px; }
.room-card-tenants { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--line); }
.room-card-actions { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--line); display: flex; justify-content: flex-end; }
.inline-icon { vertical-align: -2px; margin-right: 3px; }

/* ---------- CONTRACTS / TENANTS ---------- */
.search-bar {
  display: flex; align-items: center; gap: 8px; background: #fff;
  border: 1px solid var(--line); border-radius: 10px; padding: 9px 12px; margin-bottom: 18px; max-width: 420px;
}
.search-bar input { border: none; outline: none; font-size: 14px; width: 100%; }
.search-bar svg { color: var(--ink-400); }
.contract-list { display: flex; flex-direction: column; gap: 12px; }
.contract-card { background: #fff; border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; box-shadow: var(--shadow); }
.contract-card-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.contract-room { font-size: 14.5px; font-weight: 700; margin: 0; }
.contract-meta { display: flex; gap: 20px; margin-bottom: 12px; font-size: 13px; }
.tenant-chip-list { display: flex; flex-wrap: wrap; gap: 8px; }
.tenant-chip { background: var(--grey-bg); color: var(--ink-600); font-size: 12.5px; padding: 5px 11px; border-radius: 100px; }
.tenant-chip-rep { background: var(--blue-50); color: var(--blue-600); font-weight: 600; }

/* ---------- INVOICES ---------- */
.filter-bar { display: flex; gap: 10px; margin-bottom: 18px; }
.filter-bar select { border: 1px solid var(--line); border-radius: 8px; padding: 8px 12px; font-size: 13.5px; background: #fff; }
.invoice-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.invoice-card { background: #fff; border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; box-shadow: var(--shadow); }
.invoice-card-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.invoice-breakdown { display: flex; flex-direction: column; gap: 6px; font-size: 13.5px; margin-bottom: 6px; }
.invoice-total { border-top: 1px solid var(--line); padding-top: 8px; margin-top: 4px; font-size: 14.5px; }
.text-center { text-align: center; }

/* ---------- THU CHI ---------- */
.tag-income { color: var(--green); background: var(--green-bg); padding: 3px 9px; border-radius: 100px; font-size: 11.5px; font-weight: 700; }
.tag-expense { color: var(--red); background: var(--red-bg); padding: 3px 9px; border-radius: 100px; font-size: 11.5px; font-weight: 700; }
.text-green { color: var(--green); }
.text-red { color: var(--red); }

/* ---------- MODAL ---------- */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(15,23,42,0.45);
  display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px;
}
.modal-panel {
  background: #fff; border-radius: 16px; width: 100%; max-height: 88vh; overflow-y: auto;
  box-shadow: 0 20px 60px rgba(15,23,42,0.25);
}
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--line); }
.modal-head h3 { font-size: 16px; margin: 0; }
.modal-body { padding: 20px 22px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }

/* ---------- FORM ---------- */
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.field-label { font-size: 12.5px; font-weight: 600; color: var(--ink-600); display: flex; align-items: center; }
.field input, .field select {
  border: 1px solid var(--line); border-radius: 9px; padding: 9px 12px; font-size: 14px;
  outline: none; background: #fff; color: var(--ink-900); font-family: inherit;
}
.field input:focus, .field select:focus { border-color: var(--blue-500); box-shadow: 0 0 0 3px var(--blue-100); }
.field-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.utility-section { background: var(--blue-50); border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; }
.utility-section .field-grid-2 { margin-top: 8px; }
.invoice-preview { background: var(--grey-bg); border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; font-size: 13.5px; display: flex; flex-direction: column; gap: 6px; }
.tenant-form-section { margin: 18px 0; }
.tenant-row { display: grid; grid-template-columns: 1.4fr 1fr 1fr auto auto; gap: 8px; align-items: center; margin-top: 8px; }
.tenant-row input { border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; font-size: 13px; }
.checkbox-inline { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--ink-600); white-space: nowrap; }

/* ---------- EMPTY STATE ---------- */
.empty-state { text-align: center; padding: 50px 20px; color: var(--ink-400); }
.empty-title { font-size: 14px; font-weight: 600; color: var(--ink-600); margin: 10px 0 4px; }
.empty-hint { font-size: 13px; margin: 0; }

/* ---------- TOAST ---------- */
.toast-stack { position: fixed; bottom: 24px; right: 24px; display: flex; flex-direction: column; gap: 8px; z-index: 100; }
.toast {
  display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px;
  font-size: 13.5px; font-weight: 600; box-shadow: 0 8px 24px rgba(15,23,42,0.15); color: #fff;
}
.toast-ok { background: var(--ink-900); }
.toast-error { background: var(--red); }

.muted { color: var(--ink-400); }
.small { font-size: 12px; }

/* ---------- BOTTOM NAV (mobile) ---------- */
.bottom-nav {
  display: none;
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
  background: #fff; border-top: 1px solid var(--line);
  padding: 6px 4px calc(6px + env(safe-area-inset-bottom, 0px));
  justify-content: space-around;
  box-shadow: 0 -4px 16px rgba(15,23,42,0.06);
}
.bottom-nav-item {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  flex: 1; min-width: 0; border: none; background: none; cursor: pointer;
  padding: 6px 2px; color: var(--ink-400); font-size: 11px; font-weight: 600;
}
.bottom-nav-item span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.bottom-nav-item.active { color: var(--blue-600); }

@media (max-width: 1024px) {
  .sidebar { display: none; }
  .main { padding: 20px; padding-bottom: 90px; }
  .two-col, .house-grid, .room-grid, .invoice-list, .stat-grid { grid-template-columns: 1fr; }
  .bottom-nav { display: flex; }
}
`;
