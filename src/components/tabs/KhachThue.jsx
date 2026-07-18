// src/components/tabs/KhachThue.jsx
import { useState } from "react";
import { Plus, Users, Search, User, Phone, Calendar } from "lucide-react";
import Badge from "../common/Badge";
import EmptyState from "../common/EmptyState";
import ContractFormModal from "../modals/ContractFormModal";
import { fmtDate, fmtVND } from "../../utils/helpers";

export default function KhachThue({ rooms, contracts, tenants, loadAll, notify }) {
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
          <h1>👥 Khách thuê</h1>
          <p>Hợp đồng và danh sách người ở theo từng phòng</p>
          <div className="stats-mini">
            <span>Tổng hợp đồng: <strong>{contracts.length}</strong></span>
            <span>Đang hoạt động: <strong className="text-green">{contracts.filter(c => c.status === "active").length}</strong></span>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Lập hợp đồng mới
        </button>
      </header>

      <div className="search-bar">
        <Search size={16} />
        <input placeholder="Tìm theo tên khách, số phòng…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="contract-list">
        {rows.map(({ contract, room, people }) => (
          <div key={contract.id} className="contract-card">
            <div className="contract-card-head">
              <div>
                <p className="contract-room">Phòng {room?.room_number}</p>
                <p className="contract-date">
                  <Calendar size={14} /> {fmtDate(contract.start_date)}
                  {contract.end_date ? ` → ${fmtDate(contract.end_date)}` : ""}
                </p>
              </div>
              <Badge status={contract.status === "active" ? "da_thue" : "trong"} />
            </div>
            <div className="contract-meta">
              <span>💰 Giá thuê: <strong>{fmtVND(contract.rent_price)}</strong></span>
              <span>💳 Cọc: <strong>{fmtVND(contract.deposit)}</strong></span>
            </div>
            <div className="tenant-chip-list">
              {people.map((p) => (
                <span key={p.id} className={`tenant-chip ${p.is_representative ? "tenant-chip-rep" : ""}`}>
                  <User size={12} /> {p.full_name}
                  {p.is_representative ? " · đại diện" : ""}
                  {p.phone && <span className="tenant-phone"><Phone size={10} /> {p.phone}</span>}
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
        <ContractFormModal rooms={rooms} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); loadAll(); notify("Đã lập hợp đồng mới"); }} notify={notify} />
      )}
    </div>
  );
}