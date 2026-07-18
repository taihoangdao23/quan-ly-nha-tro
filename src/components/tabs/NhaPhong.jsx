// src/components/tabs/NhaPhong.jsx
import { useState } from "react";
import { Plus, Home, ChevronDown, Zap, Droplet, History, Pencil, Trash2, Receipt, Users } from "lucide-react";
import Badge from "../common/Badge";
import EmptyState from "../common/EmptyState";
import RoomFormModal from "../modals/RoomFormModal";
import DeleteRoomModal from "../modals/DeleteRoomModal";
import RoomHistoryModal from "../modals/RoomHistoryModal";
import InvoiceFormModal from "../modals/InvoiceFormModal";
import { fmtVND } from "../../utils/helpers";

export default function NhaPhong({ rooms, contracts, tenants, invoices, utilityReadings, loadAll, notify }) {
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [deleteRoom, setDeleteRoom] = useState(null);
  const [invoiceRoom, setInvoiceRoom] = useState(null);
  const [historyRoom, setHistoryRoom] = useState(null);
  const [openRoomId, setOpenRoomId] = useState(null);

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.status === "da_thue").length;
  const emptyRooms = totalRooms - occupiedRooms;

  return (
    <div className="page">
      <header className="page-head row-between">
        <div>
          <h1>🏠 Nhà & phòng</h1>
          <p>Danh sách tất cả các phòng đang quản lý</p>
          <div className="stats-mini">
            <span>Tổng: <strong>{totalRooms}</strong> phòng</span>
            <span className="text-green">Đã thuê: <strong>{occupiedRooms}</strong></span>
            <span className="text-red">Trống: <strong>{emptyRooms}</strong></span>
          </div>
        </div>
        <button className="btn-primary" onClick={() => { setEditRoom(null); setShowRoomModal(true); }}>
          <Plus size={16} /> Thêm phòng
        </button>
      </header>

      {/* Accordion 1 cột */}
      <div className="room-accordion">
        {rooms.map((room) => {
          const activeContract = contracts.find((c) => c.room_id === room.id && c.status === "active");
          const people = activeContract ? tenants.filter((t) => t.contract_id === activeContract.id) : [];
          const isOpen = openRoomId === room.id;
          return (
            <div key={room.id} className={`room-accordion-item ${isOpen ? "open" : ""}`}>
              <button 
                className="room-accordion-header" 
                onClick={() => setOpenRoomId(isOpen ? null : room.id)}
              >
                <span className="room-accordion-name">
                  <ChevronDown size={16} className={`room-accordion-chevron ${isOpen ? "rotated" : ""}`} />
                  {room.room_number}
                  {people.length > 0 && (
                    <span className="room-tenant-count">
                      <Users size={12} /> {people.length} người
                    </span>
                  )}
                </span>
                <span className="room-accordion-meta">
                  <span className="room-price">{fmtVND(room.rent_price)}</span>
                  <Badge status={room.status} />
                </span>
              </button>

              {isOpen && (
                <div className="room-accordion-body">
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
                  <div className="room-card-actions room-card-actions-wrap">
                    {room.status === "da_thue" && (
                      <button className="btn-ghost-sm btn-ghost-highlight" onClick={() => setInvoiceRoom(room)}>
                        <Receipt size={14} /> Lên hóa đơn
                      </button>
                    )}
                    <button className="btn-ghost-sm" onClick={() => setHistoryRoom(room)}>
                      <History size={14} /> Lịch sử
                    </button>
                    <button className="btn-ghost-sm" onClick={() => { setEditRoom(room); setShowRoomModal(true); }}>
                      <Pencil size={14} /> Sửa
                    </button>
                    <button className="btn-ghost-sm btn-ghost-danger" onClick={() => setDeleteRoom(room)}>
                      <Trash2 size={14} /> Xóa
                    </button>
                  </div>
                </div>
              )}
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

      {invoiceRoom && (
        <InvoiceFormModal 
          rooms={rooms} 
          presetRoomId={invoiceRoom.id} 
          utilityReadings={utilityReadings} 
          onClose={() => setInvoiceRoom(null)} 
          onSaved={() => { 
            setInvoiceRoom(null); 
            loadAll(); 
            notify("Đã tạo hóa đơn"); 
          }} 
          notify={notify} 
        />
      )}

      {historyRoom && (
        <RoomHistoryModal 
          room={historyRoom} 
          invoices={invoices} 
          utilityReadings={utilityReadings} 
          onClose={() => setHistoryRoom(null)} 
          onChanged={loadAll} 
          notify={notify} 
        />
      )}
    </div>
  );
}