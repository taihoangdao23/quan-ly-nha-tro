// src/components/tabs/NhaPhong.jsx
import { useState } from "react";
import { 
  Plus, Home, ChevronDown, Zap, Droplet, History, Pencil, Trash2, 
  Receipt, Users, AlertTriangle, Clock, Calendar, XCircle, CheckCircle2,
  ChevronRight
} from "lucide-react";
import Badge from "../common/Badge";
import EmptyState from "../common/EmptyState";
import RoomFormModal from "../modals/RoomFormModal";
import DeleteRoomModal from "../modals/DeleteRoomModal";
import RoomHistoryModal from "../modals/RoomHistoryModal";
import InvoiceFormModal from "../modals/InvoiceFormModal";
import { fmtVND, fmtDate } from "../../utils/helpers";
import styles from "./NhaPhong.module.css";

export default function NhaPhong({ rooms, contracts, tenants, invoices, utilityReadings, loadAll, notify }) {
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [deleteRoom, setDeleteRoom] = useState(null);
  const [invoiceRoom, setInvoiceRoom] = useState(null);
  const [historyRoom, setHistoryRoom] = useState(null);
  const [openRoomId, setOpenRoomId] = useState(null);
  const [isUnregisteredOpen, setIsUnregisteredOpen] = useState(false);

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.status === "da_thue").length;
  const emptyRooms = totalRooms - occupiedRooms;

  // ============================================================
  // TÍNH TOÁN DANH SÁCH CHƯA ĐĂNG KÝ TẠM TRÚ
  // ============================================================
  const getUnregisteredTenants = () => {
    const unregisteredList = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    contracts.forEach(contract => {
      if (contract.status !== "active") return;
      
      const room = rooms.find(r => r.id === contract.room_id);
      if (!room) return;
      
      const tenantList = tenants.filter(t => t.contract_id === contract.id);
      
      tenantList.forEach(tenant => {
        let isUnregistered = false;
        let reason = "";
        
        if (!tenant.residence_registration_date) {
          isUnregistered = true;
          reason = "Chưa đăng ký tạm trú";
        } 
        else if (tenant.temp_residence_expiry) {
          const expiryDate = new Date(tenant.temp_residence_expiry);
          expiryDate.setHours(0, 0, 0, 0);
          if (expiryDate < today) {
            isUnregistered = true;
            reason = "Đã hết hạn tạm trú";
          }
        }
        
        if (isUnregistered) {
          unregisteredList.push({
            tenant: tenant,
            room: room,
            contract: contract,
            reason: reason,
            registrationDate: tenant.residence_registration_date,
            expiryDate: tenant.temp_residence_expiry
          });
        }
      });
    });
    
    return unregisteredList;
  };

  const unregisteredTenants = getUnregisteredTenants();

  const handleNotify = (message, type = "ok") => {
    if (typeof notify === 'function') {
      notify(message, type);
    } else {
      console.warn("Notify function not available:", message);
    }
  };

  const toggleUnregistered = () => {
    setIsUnregisteredOpen(!isUnregisteredOpen);
  };

  return (
    <div className="page">
      <header className="page-head row-between">
        <div>
          <h1>🏠 Nhà & phòng</h1>
          <p>Danh sách tất cả các phòng đang quản lý</p>
          <div className={styles.statsMini}>
            <span>Tổng: <strong>{totalRooms}</strong> phòng</span>
            <span className="text-green">Đã thuê: <strong>{occupiedRooms}</strong></span>
            <span className="text-red">Trống: <strong>{emptyRooms}</strong></span>
          </div>
        </div>
        <button className="btn-primary" onClick={() => { setEditRoom(null); setShowRoomModal(true); }}>
          <Plus size={16} /> Thêm phòng
        </button>
      </header>

      {/* Danh sách chưa đăng ký tạm trú - DROPDOWN */}
      {unregisteredTenants.length > 0 && (
        <div className={styles.unregisteredSection}>
          <div className={styles.unregisteredHeader} onClick={toggleUnregistered}>
            <div className={styles.unregisteredTitle}>
              <AlertTriangle size={20} className={styles.unregisteredIcon} />
              <h2>⚠️ Danh sách chưa đăng ký tạm trú</h2>
              <span className={styles.unregisteredCount}>{unregisteredTenants.length} khách</span>
            </div>
            <div className={styles.unregisteredHeaderRight}>
              <span className={styles.unregisteredWarning}>Cần cập nhật ngay</span>
              <ChevronRight 
                size={20} 
                className={`${styles.unregisteredChevron} ${isUnregisteredOpen ? styles.rotated : ''}`}
              />
            </div>
          </div>
          
          {isUnregisteredOpen && (
            <div className={styles.unregisteredList}>
              {unregisteredTenants.map((item, index) => (
                <div key={index} className={styles.unregisteredItem}>
                  <div className={styles.unregisteredRank}>{index + 1}</div>
                  <div className={styles.unregisteredInfo}>
                    <div className={styles.unregisteredName}>
                      {item.tenant.full_name}
                      <span className={styles.unregisteredRoom}>Phòng {item.room.room_number}</span>
                    </div>
                    <div className={styles.unregisteredDetails}>
                      <span className={styles.unregisteredReason}>
                        <XCircle size={14} /> {item.reason}
                      </span>
                      {item.registrationDate && (
                        <span>
                          <Calendar size={14} /> Đăng ký: {fmtDate(item.registrationDate)}
                        </span>
                      )}
                      {item.expiryDate && (
                        <span className={styles.unregisteredExpired}>
                          <Clock size={14} /> Hết hạn: {fmtDate(item.expiryDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.unregisteredStatus}>
                    <span className={styles.unregisteredTag}>🔴 Cần xử lý</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Room Grid - 2 cột */}
      <div className={styles.roomGrid}>
        {rooms.map((room) => {
          const activeContract = contracts.find((c) => c.room_id === room.id && c.status === "active");
          const people = activeContract ? tenants.filter((t) => t.contract_id === activeContract.id) : [];
          const isOpen = openRoomId === room.id;
          return (
            <div key={room.id} className={`${styles.roomGridItem} ${isOpen ? styles.open : ""}`}>
              <button className={styles.roomGridHeader} onClick={() => setOpenRoomId(isOpen ? null : room.id)}>
                <div className={styles.roomGridHeaderLeft}>
                  <span className={styles.roomGridNumber}>{room.room_number}</span>
                  {people.length > 0 && (
                    <span className={styles.roomGridTenantCount}>
                      <Users size={12} /> {people.length} người
                    </span>
                  )}
                </div>
                <div className={styles.roomGridHeaderRight}>
                  <span className={styles.roomGridPrice}>{fmtVND(room.rent_price)}</span>
                  <Badge status={room.status} />
                </div>
              </button>

              {isOpen && (
                <div className={styles.roomGridBody}>
                  <div className={styles.roomGridDetails}>
                    <div className="row-between"><span className="muted">Giá thuê</span><strong>{fmtVND(room.rent_price)}</strong></div>
                    <div className="row-between"><span className="muted"><Zap size={13} className="inline-icon" /> Điện</span><span>{fmtVND(room.electricity_price)}/kWh</span></div>
                    <div className="row-between"><span className="muted"><Droplet size={13} className="inline-icon" /> Nước</span><span>{fmtVND(room.water_price)}/m³</span></div>
                    <div className="row-between"><span className="muted">Tiền rác</span><span>{fmtVND(room.trash_price)}/tháng</span></div>
                    {people.length > 0 && (
                      <div className={`tenant-chip-list ${styles.roomGridTenants}`}>
                        {people.map((p) => {
                          const isUnregistered = unregisteredTenants.some(u => u.tenant.id === p.id);
                          return (
                            <span 
                              key={p.id} 
                              className={`tenant-chip ${p.is_representative ? "tenant-chip-rep" : ""} ${isUnregistered ? styles.unregisteredChip : ""}`}
                            >
                              {p.full_name}
                              {p.is_representative ? " · chủ phòng" : ""}
                              {isUnregistered && <span className={styles.unregisteredBadge}>⚠️</span>}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className={styles.roomGridActions}>
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
          <div className={styles.emptyStateFull}>
            <EmptyState icon={Home} title="Chưa có phòng nào" hint="Thêm phòng đầu tiên để bắt đầu quản lý" />
          </div>
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
            handleNotify(editRoom ? "Đã cập nhật phòng thành công!" : "Đã thêm phòng mới thành công!"); 
          }} 
          notify={handleNotify}
        />
      )}

      {deleteRoom && (
        <DeleteRoomModal 
          room={deleteRoom} 
          onClose={() => setDeleteRoom(null)} 
          onDeleted={() => { 
            setDeleteRoom(null); 
            loadAll(); 
            handleNotify("Đã xóa phòng thành công!"); 
          }} 
          notify={handleNotify}
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
            handleNotify("Đã tạo hóa đơn thành công!"); 
          }} 
          notify={handleNotify}
        />
      )}

      {historyRoom && (
        <RoomHistoryModal 
          room={historyRoom} 
          invoices={invoices} 
          utilityReadings={utilityReadings} 
          onClose={() => setHistoryRoom(null)} 
          onChanged={loadAll} 
          notify={handleNotify}
        />
      )}
    </div>
  );
}