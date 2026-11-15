// src/components/tabs/KhachThue.jsx
import { useState, useMemo } from "react";
import { 
  Plus, Users, Search, User, Phone, Calendar, 
  Pencil, CheckCircle, Trash2, AlertCircle, Clock, AlertTriangle 
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import Badge from "../common/Badge";
import EmptyState from "../common/EmptyState";
import Modal from "../common/Modal";
import ContractFormModal from "../modals/ContractFormModal";
import { fmtDate, fmtVND } from "../../utils/helpers";

export default function KhachThue({ rooms, contracts, tenants, loadAll, notify }) {
  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [deleteContract, setDeleteContract] = useState(null);
  const [endingContract, setEndingContract] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'ended'
  const [working, setWorking] = useState(false);

  // Tính số ngày còn lại đến khi hết hạn hợp đồng
  const getDaysRemaining = (endDateStr) => {
    if (!endDateStr) return null;
    const end = new Date(endDateStr);
    const now = new Date();
    end.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  };

  const rows = useMemo(() => {
    return contracts
      .map((c) => {
        const room = rooms.find((r) => r.id === c.room_id);
        const people = tenants.filter((t) => t.contract_id === c.id);
        const daysLeft = getDaysRemaining(c.end_date);
        return { contract: c, room, people, daysLeft };
      })
      .filter((row) => {
        // Lọc theo trạng thái
        if (statusFilter === "active" && row.contract.status !== "active") return false;
        if (statusFilter === "ended" && row.contract.status === "active") return false;

        // Lọc theo từ khóa tìm kiếm
        if (!search.trim()) return true;
        const s = search.toLowerCase().trim();
        return (
          row.room?.room_number?.toLowerCase().includes(s) ||
          row.people.some((p) => p.full_name?.toLowerCase().includes(s)) ||
          row.people.some((p) => p.phone?.includes(s))
        );
      });
  }, [contracts, rooms, tenants, statusFilter, search]);

  const activeCount = contracts.filter((c) => c.status === "active").length;
  const expiringCount = contracts.filter((c) => {
    if (c.status !== "active" || !c.end_date) return false;
    const days = getDaysRemaining(c.end_date);
    return days !== null && days >= 0 && days <= 30;
  }).length;

  // Xử lý thanh lý / kết thúc hợp đồng
  const handleEndContract = async () => {
    if (!endingContract) return;
    setWorking(true);
    try {
      // 1. Chuyển trạng thái hợp đồng thành ended
      const { error: contractErr } = await supabase
        .from("contracts")
        .update({ status: "ended", updated_at: new Date().toISOString() })
        .eq("id", endingContract.id);

      if (contractErr) throw contractErr;

      // 2. Chuyển trạng thái phòng về trống
      if (endingContract.room_id) {
        await supabase
          .from("rooms")
          .update({ status: "trong" })
          .eq("id", endingContract.room_id);
      }

      notify("Đã kết thúc hợp đồng và cập nhật phòng về trạng thái trống");
      setEndingContract(null);
      loadAll();
    } catch (e) {
      notify(e.message || "Lỗi khi kết thúc hợp đồng", "error");
    } finally {
      setWorking(false);
    }
  };

  // Xử lý xóa hợp đồng
  const handleDeleteContract = async () => {
    if (!deleteContract) return;
    setWorking(true);
    try {
      const { error } = await supabase.from("contracts").delete().eq("id", deleteContract.id);
      if (error) throw error;

      notify("Đã xóa hợp đồng thành công");
      setDeleteContract(null);
      loadAll();
    } catch (e) {
      notify(e.message || "Lỗi khi xóa hợp đồng", "error");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="page">
      <header className="page-head row-between">
        <div>
          <h1>👥 Khách thuê & Hợp đồng</h1>
          <p>Quản lý hợp đồng cho thuê, thời hạn và cư dân lưu trú</p>
          <div className="stats-mini">
            <span>Tổng hợp đồng: <strong>{contracts.length}</strong></span>
            <span>Đang hoạt động: <strong className="text-green">{activeCount}</strong></span>
            {expiringCount > 0 && (
              <span style={{ color: "#d97706" }}>
                <Clock size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                Sắp hết hạn (≤ 30 ngày): <strong>{expiringCount}</strong>
              </span>
            )}
          </div>
        </div>
        <button className="btn-primary" onClick={() => { setEditingContract(null); setShowModal(true); }}>
          <Plus size={16} /> Lập hợp đồng mới
        </button>
      </header>

      {/* Thanh lọc & tìm kiếm */}
      <div className="filter-bar" style={{ gap: 12 }}>
        <div className="filter-group">
          <button 
            className={`btn-ghost-sm ${statusFilter === "all" ? "btn-ghost-highlight" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            Tất cả ({contracts.length})
          </button>
          <button 
            className={`btn-ghost-sm ${statusFilter === "active" ? "btn-ghost-highlight" : ""}`}
            onClick={() => setStatusFilter("active")}
          >
            Đang thuê ({activeCount})
          </button>
          <button 
            className={`btn-ghost-sm ${statusFilter === "ended" ? "btn-ghost-highlight" : ""}`}
            onClick={() => setStatusFilter("ended")}
          >
            Đã kết thúc ({contracts.length - activeCount})
          </button>
        </div>

        <div className="search-bar" style={{ flex: 1 }}>
          <Search size={16} />
          <input 
            placeholder="Tìm theo số phòng, tên khách, số điện thoại…" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
      </div>

      {/* Danh sách hợp đồng */}
      <div className="contract-list">
        {rows.map(({ contract, room, people, daysLeft }) => {
          const isActive = contract.status === "active";
          const isExpiring = isActive && daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

          return (
            <div key={contract.id} className="contract-card" style={{ opacity: isActive ? 1 : 0.75 }}>
              <div className="contract-card-head">
                <div>
                  <p className="contract-room">Phòng {room?.room_number || "—"}</p>
                  <p className="contract-date">
                    <Calendar size={14} /> {fmtDate(contract.start_date)}
                    {contract.end_date ? ` → ${fmtDate(contract.end_date)}` : " (Vô thời hạn)"}
                  </p>
                  {isExpiring && (
                    <span className="small text-orange" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                      <AlertCircle size={13} /> Sắp hết hạn trong {daysLeft} ngày
                    </span>
                  )}
                </div>
                <Badge status={isActive ? "da_thue" : "trong"} label={isActive ? "Đang thuê" : "Đã thanh lý"} />
              </div>

              <div className="contract-meta">
                <span>💰 Giá thuê: <strong>{fmtVND(contract.rent_price)}</strong></span>
                <span>💳 Cọc: <strong>{fmtVND(contract.deposit)}</strong></span>
              </div>

              {/* Danh sách người ở */}
              <div className="tenant-chip-list" style={{ marginTop: 10 }}>
                {people.map((p) => {
                  const noTamTru = !p.residence_registration_date;
                  return (
                    <span 
                      key={p.id} 
                      className={`tenant-chip ${p.is_representative ? "tenant-chip-rep" : ""}`}
                      title={noTamTru ? "Chưa đăng ký tạm trú" : `Tạm trú đến: ${p.temp_residence_expiry || "Chưa rõ"}`}
                    >
                      <User size={12} /> {p.full_name}
                      {p.is_representative && " · đại diện"}
                      {p.phone && (
                        <a 
                          href={`tel:${p.phone}`} 
                          className="tenant-phone" 
                          style={{ textDecoration: "none", color: "inherit", marginLeft: 4 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone size={10} /> {p.phone}
                        </a>
                      )}
                      {noTamTru && <AlertTriangle size={11} color="#ef4444" style={{ marginLeft: 4 }} />}
                    </span>
                  );
                })}
                {people.length === 0 && <span className="muted small">Chưa có thông tin cư dân</span>}
              </div>

              {/* Nhóm nút tác vụ quản lý */}
              <div className="invoice-card-actions" style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                <button 
                  className="btn-ghost-sm" 
                  onClick={() => { setEditingContract(contract); setShowModal(true); }}
                >
                  <Pencil size={14} /> Sửa
                </button>

                {isActive && (
                  <button 
                    className="btn-ghost-sm text-green" 
                    onClick={() => setEndingContract(contract)}
                  >
                    <CheckCircle size={14} /> Trả phòng / Kết thúc
                  </button>
                )}

                <button 
                  className="btn-ghost-sm btn-ghost-danger" 
                  onClick={() => setDeleteContract(contract)}
                >
                  <Trash2 size={14} /> Xóa
                </button>
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <EmptyState 
            icon={Users} 
            title="Không tìm thấy hợp đồng" 
            hint="Không có hợp đồng nào phù hợp với bộ lọc tìm kiếm" 
          />
        )}
      </div>

      {/* Modal Lập / Sửa hợp đồng */}
      {showModal && (
        <ContractFormModal 
          rooms={rooms} 
          contract={editingContract}
          onClose={() => { setShowModal(false); setEditingContract(null); }} 
          onSaved={() => { 
            setShowModal(false); 
            setEditingContract(null); 
            loadAll(); 
            notify(editingContract ? "Đã cập nhật hợp đồng" : "Đã lập hợp đồng mới"); 
          }} 
          notify={notify} 
        />
      )}

      {/* Modal xác nhận thanh lý / trả phòng */}
      {endingContract && (
        <Modal title="Kết thúc hợp đồng / Trả phòng" onClose={() => setEndingContract(null)} width={420}>
          <p>
            Xác nhận kết thúc hợp đồng phòng <strong>{rooms.find(r => r.id === endingContract.room_id)?.room_number}</strong>?
          </p>
          <p className="muted small" style={{ marginTop: 8 }}>
            Hợp đồng sẽ chuyển sang trạng thái <strong>Đã thanh lý</strong> và trạng thái phòng sẽ tự động chuyển về <strong>Phòng trống</strong>.
          </p>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setEndingContract(null)} disabled={working}>Hủy</button>
            <button className="btn-primary" onClick={handleEndContract} disabled={working}>
              {working ? "Đang xử lý…" : "Xác nhận kết thúc"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal xác nhận xóa hợp đồng */}
      {deleteContract && (
        <Modal title="Xóa hợp đồng" onClose={() => setDeleteContract(null)} width={420}>
          <p>
            Bạn có chắc chắn muốn xóa vĩnh viễn hợp đồng phòng <strong>{rooms.find(r => r.id === deleteContract.room_id)?.room_number}</strong>?
          </p>
          <p className="muted small" style={{ marginTop: 8, color: "var(--red)" }}>
            Hành động này không thể hoàn tác. Các dữ liệu liên quan có thể bị ảnh hưởng.
          </p>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setDeleteContract(null)} disabled={working}>Hủy</button>
            <button className="btn-danger" onClick={handleDeleteContract} disabled={working}>
              {working ? "Đang xóa…" : "Xóa hợp đồng"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}