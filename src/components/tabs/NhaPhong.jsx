// src/components/tabs/NhaPhong.jsx
import { useState, useMemo } from "react";
import { 
  Plus, Home, Zap, Droplet, History, Pencil, Trash2, 
  Receipt, Users, AlertTriangle, Clock, Calendar, XCircle, 
  ChevronRight, Phone, CreditCard, MapPin, ShieldCheck, Save
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import Badge from "../common/Badge";
import EmptyState from "../common/EmptyState";
import Modal from "../common/Modal";
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
  const [isTamTruOpen, setIsTamTruOpen] = useState(false);

  // State cho Modal Đăng ký / Gia hạn tạm trú
  const [tamTruModal, setTamTruModal] = useState(null); // { tenant, room, mode: 'register' | 'renew' }
  const [regDateInput, setRegDateInput] = useState("");
  const [expDateInput, setExpDateInput] = useState("");
  const [savingTamTru, setSavingTamTru] = useState(false);

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === "da_thue").length;
  const emptyRooms = totalRooms - occupiedRooms;

  const handleNotify = (message, type = "ok") => {
    if (typeof notify === "function") {
      notify(message, type);
    } else {
      console.warn("Notify function not available:", message);
    }
  };

  // ============================================================
  // PHÂN LOẠI 2 NHÓM TẠM TRÚ:
  // 1. Cần gia hạn trước 1 tháng (còn <= 30 ngày là hết hạn, hoặc đã quá hạn)
  // 2. Chưa đăng ký tạm trú
  // ============================================================
  const { renewList, unregisteredList } = useMemo(() => {
    const renew = [];
    const unregistered = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneMonthLater = new Date(today);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    contracts.forEach((contract) => {
      if (contract.status !== "active") return;

      const room = rooms.find((r) => r.id === contract.room_id);
      if (!room) return;

      const tenantList = tenants.filter((t) => t.contract_id === contract.id);

      tenantList.forEach((tenant) => {
        // Nhóm 2: Chưa đăng ký tạm trú
        if (!tenant.residence_registration_date) {
          unregistered.push({
            tenant,
            room,
            contract,
          });
          return;
        }

        // Nhóm 1: Đã đăng ký nhưng còn <= 1 tháng là hết hạn (hoặc đã hết hạn)
        if (tenant.temp_residence_expiry) {
          const expiryDate = new Date(tenant.temp_residence_expiry);
          expiryDate.setHours(0, 0, 0, 0);

          if (expiryDate <= oneMonthLater) {
            const diffTime = expiryDate - today;
            const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            renew.push({
              tenant,
              room,
              contract,
              expiryDate: tenant.temp_residence_expiry,
              registrationDate: tenant.residence_registration_date,
              daysRemaining,
              isExpired: daysRemaining < 0,
            });
          }
        }
      });
    });

    // Sắp xếp nhóm gia hạn: người gần hết hạn / quá hạn nhất lên đầu
    renew.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return { renewList: renew, unregisteredList: unregistered };
  }, [contracts, rooms, tenants]);

  const totalAlertCount = renewList.length + unregisteredList.length;

  // Mở Modal điền thông tin đăng ký / gia hạn
  const openTamTruModal = (tenant, room, mode) => {
    const todayStr = new Date().toISOString().split("T")[0];
    setTamTruModal({ tenant, room, mode });

    if (mode === "register") {
      setRegDateInput(tenant.residence_registration_date || todayStr);
      setExpDateInput(tenant.temp_residence_expiry || "");
    } else {
      // Gia hạn: giữ nguyên ngày đăng ký cũ (hoặc hôm nay), cho chọn ngày hết hạn mới
      setRegDateInput(tenant.residence_registration_date || todayStr);
      setExpDateInput(tenant.temp_residence_expiry || "");
    }
  };

  // Lưu thông tin tạm trú lên Supabase
  const handleSaveTamTru = async (e) => {
    e.preventDefault();
    if (!tamTruModal) return;

    if (!regDateInput) {
      return handleNotify("Vui lòng chọn ngày đăng ký tạm trú", "error");
    }
    if (!expDateInput) {
      return handleNotify("Vui lòng chọn ngày hết hạn tạm trú", "error");
    }

    setSavingTamTru(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          residence_registration_date: regDateInput,
          temp_residence_expiry: expDateInput,
        })
        .eq("id", tamTruModal.tenant.id);

      if (error) throw error;

      handleNotify(
        tamTruModal.mode === "register"
          ? `Đã đăng ký tạm trú cho ${tamTruModal.tenant.full_name}`
          : `Đã gia hạn tạm trú cho ${tamTruModal.tenant.full_name}`
      );
      setTamTruModal(null);
      loadAll();
    } catch (err) {
      handleNotify(err.message || "Lỗi khi cập nhật thông tin tạm trú", "error");
    } finally {
      setSavingTamTru(false);
    }
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

      {/* ============================================================
          THANH THÔNG BÁO TẠM TRÚ XỔ XUỐNG (2 NHÓM)
          ============================================================ */}
      {totalAlertCount > 0 && (
        <div className={styles.unregisteredSection}>
          <div className={styles.unregisteredHeader} onClick={() => setIsTamTruOpen(!isTamTruOpen)}>
            <div className={styles.unregisteredTitle}>
              <AlertTriangle size={20} className={styles.unregisteredIcon} />
              <h2>⚠️ Thông báo đăng ký & gia hạn tạm trú</h2>
              <span className={styles.unregisteredCount}>{totalAlertCount} khách</span>
            </div>
            <div className={styles.unregisteredHeaderRight}>
              {renewList.length > 0 && (
                <span className={styles.badgeRenewSummary}>
                  ⏰ {renewList.length} sắp hết hạn
                </span>
              )}
              {unregisteredList.length > 0 && (
                <span className={styles.unregisteredWarning}>
                  🔴 {unregisteredList.length} chưa đăng ký
                </span>
              )}
              <ChevronRight
                size={20}
                className={`${styles.unregisteredChevron} ${isTamTruOpen ? styles.rotated : ""}`}
              />
            </div>
          </div>

          {isTamTruOpen && (
            <div className={styles.dropdownBody}>
              {/* NHÓM 1: CẦN GIA HẠN TẠM TRÚ TRƯỚC 1 THÁNG */}
              {renewList.length > 0 && (
                <div className={styles.groupBlock}>
                  <div className={styles.groupHeadingRenew}>
                    <Clock size={15} />
                    <span>Nhóm 1: Cần gia hạn tạm trú (còn dưới 1 tháng) — {renewList.length} người</span>
                  </div>
                  <div className={styles.unregisteredList}>
                    {renewList.map((item, index) => (
                      <div key={item.tenant.id} className={`${styles.unregisteredItem} ${styles.itemRenew}`}>
                        <div className={styles.unregisteredRank}>{index + 1}</div>
                        <div className={styles.unregisteredInfo}>
                          <div className={styles.unregisteredName}>
                            {item.tenant.full_name}
                            <span className={styles.unregisteredRoom}>Phòng {item.room.room_number}</span>
                          </div>
                          <div className={styles.unregisteredDetails}>
                            <span className={styles.unregisteredExpired}>
                              <Clock size={13} />{" "}
                              {item.isExpired
                                ? `Đã quá hạn ${Math.abs(item.daysRemaining)} ngày`
                                : `Còn ${item.daysRemaining} ngày nữa hết hạn tạm trú`}
                            </span>
                            <span>
                              <Calendar size={13} /> Hết hạn: <strong>{fmtDate(item.expiryDate)}</strong>
                            </span>
                          </div>
                        </div>
                        <div className={styles.itemAction}>
                          <button
                            className={styles.btnRenew}
                            onClick={() => openTamTruModal(item.tenant, item.room, "renew")}
                          >
                            Gia hạn
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NHÓM 2: CHƯA ĐĂNG KÝ TẠM TRÚ */}
              {unregisteredList.length > 0 && (
                <div className={styles.groupBlock}>
                  <div className={styles.groupHeadingUnregistered}>
                    <XCircle size={15} />
                    <span>Nhóm 2: Chưa đăng ký tạm trú — {unregisteredList.length} người</span>
                  </div>
                  <div className={styles.unregisteredList}>
                    {unregisteredList.map((item, index) => (
                      <div key={item.tenant.id} className={`${styles.unregisteredItem} ${styles.itemUnreg}`}>
                        <div className={styles.unregisteredRank}>{index + 1}</div>
                        <div className={styles.unregisteredInfo}>
                          <div className={styles.unregisteredName}>
                            {item.tenant.full_name}
                            <span className={styles.unregisteredRoom}>Phòng {item.room.room_number}</span>
                          </div>
                          <div className={styles.unregisteredDetails}>
                            <span className={styles.unregisteredReason}>
                              <XCircle size={13} /> Người này chưa đăng ký tạm trú
                            </span>
                          </div>
                        </div>
                        <div className={styles.itemAction}>
                          <button
                            className={styles.btnRegister}
                            onClick={() => openTamTruModal(item.tenant, item.room, "register")}
                          >
                            Đăng ký
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          ROOM GRID - 2 CỘT
          ============================================================ */}
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
                          const needAction =
                            renewList.some((u) => u.tenant.id === p.id) ||
                            unregisteredList.some((u) => u.tenant.id === p.id);
                          return (
                            <span
                              key={p.id}
                              className={`tenant-chip ${p.is_representative ? "tenant-chip-rep" : ""} ${needAction ? styles.unregisteredChip : ""}`}
                            >
                              {p.full_name}
                              {p.is_representative ? " · chủ phòng" : ""}
                              {needAction && <span className={styles.unregisteredBadge}>⚠️</span>}
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

      {/* ============================================================
          MODAL THÔNG TIN NGƯỜI THUÊ & CẬP NHẬT TẠM TRÚ
          ============================================================ */}
      {tamTruModal && (
        <Modal
          title={
            tamTruModal.mode === "register"
              ? "Đăng ký tạm trú mới"
              : "Gia hạn tạm trú"
          }
          onClose={() => setTamTruModal(null)}
          width={480}
        >
          <form onSubmit={handleSaveTamTru} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Bảng thông tin cá nhân người thuê */}
            <div className={styles.tenantProfileCard}>
              <div className={styles.tenantProfileHead}>
                <div className={styles.tenantAvatar}>
                  {tamTruModal.tenant.full_name?.charAt(0)?.toUpperCase() || "K"}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: "#111827" }}>
                    {tamTruModal.tenant.full_name}
                  </h3>
                  <span className="small muted">
                    Phòng {tamTruModal.room?.room_number || "—"}
                    {tamTruModal.tenant.is_representative ? " · Đại diện hợp đồng" : ""}
                  </span>
                </div>
              </div>

              <div className={styles.tenantProfileRows}>
                <div className="row-between">
                  <span className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Phone size={14} /> Số điện thoại:
                  </span>
                  <strong>{tamTruModal.tenant.phone || "Chưa cập nhật"}</strong>
                </div>
                <div className="row-between">
                  <span className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <CreditCard size={14} /> Số CCCD:
                  </span>
                  <strong>
                    {tamTruModal.tenant.citizen_id || tamTruModal.tenant.cccd || "Chưa cập nhật"}
                  </strong>
                </div>
                <div className="row-between" style={{ alignItems: "flex-start" }}>
                  <span className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                    <MapPin size={14} /> Nơi thường trú:
                  </span>
                  <span style={{ textAlign: "right", maxWidth: "62%", fontWeight: 500 }}>
                    {tamTruModal.tenant.permanent_address || tamTruModal.tenant.hometown || "Chưa cập nhật"}
                  </span>
                </div>
              </div>
            </div>

            {/* 2 trường nhập Ngày đăng ký và Ngày hết hạn tạm trú */}
            <div className={styles.tamTruFormBox}>
              <p className={styles.tamTruFormTitle}>
                <ShieldCheck size={16} /> Thông tin đăng ký tạm trú
              </p>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                  Ngày đăng ký tạm trú *
                </label>
                <input
                  type="date"
                  className="input"
                  value={regDateInput}
                  onChange={(e) => setRegDateInput(e.target.value)}
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                  Ngày hết hạn tạm trú *
                </label>
                <input
                  type="date"
                  className="input"
                  value={expDateInput}
                  onChange={(e) => setExpDateInput(e.target.value)}
                  required
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setTamTruModal(null)}
                disabled={savingTamTru}
              >
                Hủy
              </button>
              <button type="submit" className="btn-primary" disabled={savingTamTru}>
                <Save size={15} />{" "}
                {savingTamTru
                  ? "Đang lưu..."
                  : tamTruModal.mode === "register"
                  ? "Lưu đăng ký"
                  : "Lưu gia hạn"}
              </button>
            </div>
          </form>
        </Modal>
      )}

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