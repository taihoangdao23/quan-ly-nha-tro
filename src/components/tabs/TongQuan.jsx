// src/components/tabs/TongQuan.jsx
import { useState, useMemo, useRef } from "react";
import { 
  Building2, CheckCircle2, Circle, AlertCircle, Calendar, 
  Clock, AlertTriangle, Receipt, Send, XCircle, ChevronRight,
  Phone, CreditCard, MapPin, ShieldCheck, Save
} from "lucide-react";
import html2canvas from "html2canvas";
import { supabase } from "../../supabaseClient";
import Badge from "../common/Badge";
import EmptyState from "../common/EmptyState";
import Modal from "../common/Modal";
import { fmtVND, fmtDate } from "../../utils/helpers";
import styles from "./TongQuan.module.css";

export default function TongQuan({ rooms, invoices, expenses, contracts, tenants, loadAll, notify }) {
  const [copying, setCopying] = useState(false);
  const tableWrapRef = useRef(null);

  // State cho thanh thông báo tạm trú xổ xuống & Modal cập nhật
  const [isTamTruOpen, setIsTamTruOpen] = useState(false);
  const [tamTruModal, setTamTruModal] = useState(null); // { tenant, room, mode: 'register' | 'renew' }
  const [regDateInput, setRegDateInput] = useState("");
  const [expDateInput, setExpDateInput] = useState("");
  const [savingTamTru, setSavingTamTru] = useState(false);

  const occupied = rooms.filter((r) => r.status === "da_thue").length;
  const empty = rooms.length - occupied;
  const unpaid = invoices.filter((i) => i.status === "chua_thanh_toan");
  const unpaidTotal = unpaid.reduce((s, i) => s + Number(i.total_amount), 0);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const thisMonthInvoices = invoices.filter(
    (i) => i.month === currentMonth && i.year === currentYear
  );
  const collected = thisMonthInvoices
    .filter((i) => i.status === "da_thanh_toan")
    .reduce((s, i) => s + Number(i.total_amount), 0);
  const expectedThisMonth = thisMonthInvoices.reduce((s, i) => s + Number(i.total_amount), 0);

  const thisMonthExpenses = expenses
    .filter((e) => {
      const d = new Date(e.expense_date);
      return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((s, e) => s + Number(e.amount), 0);

  const handleNotify = (message, type = "ok") => {
    if (typeof notify === "function") {
      notify(message, type);
    } else {
      console.warn("Notify function not available:", message);
    }
  };

  // ============================================================
  // 1. PHÂN LOẠI 2 NHÓM TẠM TRÚ (CẦN GIA HẠN <= 1 THÁNG & CHƯA ĐĂNG KÝ)
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

    renew.sort((a, b) => a.daysRemaining - b.daysRemaining);
    return { renewList: renew, unregisteredList: unregistered };
  }, [contracts, rooms, tenants]);

  const totalAlertCount = renewList.length + unregisteredList.length;

  const openTamTruModal = (tenant, room, mode) => {
    const todayStr = new Date().toISOString().split("T")[0];
    setTamTruModal({ tenant, room, mode });
    setRegDateInput(tenant.residence_registration_date || todayStr);
    setExpDateInput(tenant.temp_residence_expiry || "");
  };

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
      if (typeof loadAll === "function") loadAll();
    } catch (err) {
      handleNotify(err.message || "Lỗi khi cập nhật thông tin tạm trú", "error");
    } finally {
      setSavingTamTru(false);
    }
  };

  // ============================================================
  // 2. TÍNH TOÁN DANH SÁCH THU TIỀN THÁNG HIỆN TẠI
  // ============================================================
  const collectionList = useMemo(() => {
    const occupiedRooms = rooms.filter((r) => r.status === "da_thue");
    return occupiedRooms.map((room) => {
      const activeContract = contracts.find(
        (c) => c.room_id === room.id && c.status === "active"
      );
      let representative = null;
      if (activeContract) {
        const reps = tenants.filter(
          (t) => t.contract_id === activeContract.id && t.is_representative === true
        );
        representative =
          reps.length > 0
            ? reps[0]
            : tenants.filter((t) => t.contract_id === activeContract.id)[0];
      }
      const invoice = invoices.find(
        (i) => i.room_id === room.id && i.month === currentMonth && i.year === currentYear
      );
      return {
        roomId: room.id,
        roomNumber: room.room_number,
        representative: representative?.full_name || "Chưa có",
        totalAmount: invoice ? invoice.total_amount : 0,
        hasInvoice: !!invoice,
      };
    });
  }, [rooms, contracts, tenants, invoices, currentMonth, currentYear]);

  const collectionTotalAmount = collectionList.reduce(
    (sum, item) => sum + Number(item.totalAmount),
    0
  );

  // Sao chép ảnh danh sách thu theo form mobile (430px)
  const handleCopyImage = async () => {
    if (collectionList.length === 0) return;
    const el = tableWrapRef.current;
    if (!el) return;

    setCopying(true);
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: -window.scrollY,
        scrollX: -window.scrollX,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.querySelector(`[data-capture="tong-quan-thu-tien"]`);
          if (clonedEl) {
            clonedEl.style.width = "430px";
            clonedEl.style.maxWidth = "430px";
            clonedEl.style.minWidth = "430px";
            clonedEl.style.borderRadius = "0px";
            clonedEl.style.boxSizing = "border-box";
            clonedEl.style.padding = "24px 16px";
          }
          const clonedTableScroll = clonedDoc.querySelector(".table-scroll");
          if (clonedTableScroll) {
            clonedTableScroll.style.overflow = "visible";
            clonedTableScroll.style.maxHeight = "none";
          }
          const clonedTable = clonedDoc.querySelector(".table");
          if (clonedTable) {
            clonedTable.style.width = "100%";
            clonedTable.style.fontSize = "13px";
          }
        },
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setCopying(false);
          return;
        }
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          handleNotify("Đã sao chép ảnh danh sách thu! Hãy dán (Ctrl+V) vào Zalo.");
        } catch (err) {
          console.error(err);
          handleNotify("Trình duyệt chặn sao chép ảnh.", "error");
        }
        setCopying(false);
      }, "image/png");
    } catch (e) {
      console.error(e);
      setCopying(false);
    }
  };

  // Stats cho dashboard
  const stats = [
    {
      title: "Tổng số phòng",
      value: rooms.length,
      icon: Building2,
      color: "blue",
      change: `+0%`,
    },
    {
      title: "Đang thuê",
      value: occupied,
      icon: CheckCircle2,
      color: "green",
      change: `+${occupied > 0 ? Math.round((occupied / rooms.length) * 100) : 0}%`,
    },
    {
      title: "Phòng trống",
      value: empty,
      icon: Circle,
      color: "orange",
      change: empty > 0 ? `${Math.round((empty / rooms.length) * 100)}%` : "0%",
    },
    {
      title: "Hóa đơn chưa thu",
      value: fmtVND(unpaidTotal),
      icon: AlertCircle,
      color: "red",
      change: `+${unpaid.length}`,
    },
  ];

  return (
    <div className="page">
      <header className="page-head">
        <h1>📊 Tổng quan</h1>
        <p>
          Tình hình nhà trọ tháng {currentMonth}/{currentYear}
        </p>
      </header>

      {/* ============================================================
          1. THANH THÔNG BÁO ĐĂNG KÝ & GIA HẠN TẠM TRÚ (2 NHÓM)
          ============================================================ */}
      {totalAlertCount > 0 ? (
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
      ) : (
        <div className={styles.tamTruOkBanner}>
          <CheckCircle2 size={20} color="#16a34a" />
          <span>Tất cả khách thuê đều đã đăng ký và còn hạn tạm trú.</span>
        </div>
      )}

      {/* ============================================================
          2. DANH SÁCH THU TIỀN THÁNG HIỆN TẠI (NGAY SAU THÔNG BÁO TẠM TRÚ)
          ============================================================ */}
      <div className={styles.collectionSection}>
        <div
          ref={tableWrapRef}
          data-capture="tong-quan-thu-tien"
          className={styles.collectionCaptureBox}
        >
          <div className={styles.collectionHeader}>
            <h3 className={styles.collectionTitle}>
              DANH SÁCH THU TIỀN THÁNG {currentMonth}/{currentYear}
            </h3>
          </div>
          <div className="table-scroll">
            <table
              className="table"
              style={{ width: "100%", color: "#111827", borderCollapse: "collapse" }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "left", color: "#111827", padding: "10px 8px" }}>
                    Phòng
                  </th>
                  <th style={{ textAlign: "left", color: "#111827", padding: "10px 8px" }}>
                    Chủ hộ/Đại diện
                  </th>
                  <th style={{ textAlign: "right", color: "#111827", padding: "10px 8px" }}>
                    Tổng tiền
                  </th>
                </tr>
              </thead>
              <tbody>
                {collectionList.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", padding: "32px 0" }}>
                      <EmptyState
                        icon={Receipt}
                        title="Không có dữ liệu"
                        hint="Không có phòng nào đang thuê trong tháng này"
                      />
                    </td>
                  </tr>
                ) : (
                  collectionList.map((item) => (
                    <tr key={item.roomId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ color: "#111827", padding: "10px 8px" }}>
                        <strong>{item.roomNumber}</strong>
                      </td>
                      <td style={{ color: "#111827", padding: "10px 8px" }}>
                        {item.representative}
                      </td>
                      <td style={{ textAlign: "right", color: "#111827", padding: "10px 8px" }}>
                        <strong>{item.hasInvoice ? fmtVND(item.totalAmount) : "—"}</strong>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {collectionList.length > 0 && (
                <tfoot>
                  <tr
                    style={{
                      fontWeight: 700,
                      background: "#f9fafb",
                      color: "#111827",
                      borderTop: "2px solid #e5e7eb",
                    }}
                  >
                    <td colSpan={2} style={{ textAlign: "right", padding: "12px 8px" }}>
                      TỔNG CỘNG
                    </td>
                    <td style={{ textAlign: "right", padding: "12px 8px" }}>
                      {fmtVND(collectionTotalAmount)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {collectionList.length > 0 && (
          <div className={styles.collectionActions}>
            <button
              className="btn-secondary"
              onClick={handleCopyImage}
              disabled={copying}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <Send size={16} /> {copying ? "Đang xử lý..." : "Gửi Danh Sách"}
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="stat-card">
              <div className={`stat-icon stat-icon-${stat.color}`}>
                <Icon size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">{stat.title}</span>
                <span className="stat-value">{stat.value}</span>
                <span className="stat-change up">{stat.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout */}
      <div className="two-col">
        {/* Left Column - Revenue */}
        <div className="panel">
          <h3>💰 Thu trong tháng</h3>
          <div className="revenue-item">
            <span className="muted">Đã thu</span>
            <strong className="text-green">{fmtVND(collected)}</strong>
          </div>
          <div className="revenue-item">
            <span className="muted">Dự kiến tổng</span>
            <strong>{fmtVND(expectedThisMonth)}</strong>
          </div>
          <div className="revenue-item">
            <span className="muted">Chi phí trong tháng</span>
            <strong className="text-red">{fmtVND(thisMonthExpenses)}</strong>
          </div>
          <div className="revenue-divider"></div>
          <div className="revenue-item total">
            <span className="muted">Lợi nhuận dự kiến</span>
            <strong className="text-green">
              {fmtVND(expectedThisMonth - thisMonthExpenses)}
            </strong>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${
                  expectedThisMonth
                    ? Math.min(100, (collected / expectedThisMonth) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="progress-label">
            {Math.round(expectedThisMonth ? (collected / expectedThisMonth) * 100 : 0)}% đã thu
          </p>
        </div>

        {/* Right Column - Empty Rooms */}
        <div className="panel">
          <h3>🏠 Phòng còn trống</h3>
          <div className="empty-rooms-list">
            {rooms
              .filter((r) => r.status === "trong")
              .map((r) => (
                <div key={r.id} className="empty-room-item">
                  <div>
                    <p className="room-name">{r.room_number}</p>
                    <span className="room-status empty">Trống</span>
                  </div>
                  <span className="room-price">{fmtVND(r.rent_price)}</span>
                </div>
              ))}
            {empty === 0 && (
              <div className="all-rented">
                <CheckCircle2 size={40} color="#34a853" />
                <p className="all-rented-text">Tất cả phòng đều đã có khách thuê! 🎉</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unpaid Invoices */}
      {unpaid.length > 0 && (
        <div className="panel">
          <div className="invoice-header">
            <h3>📄 Hóa đơn chưa thanh toán ({unpaid.length})</h3>
            <span className="invoice-total-badge">Tổng: {fmtVND(unpaidTotal)}</span>
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Phòng</th>
                  <th>Tháng</th>
                  <th style={{ textAlign: "right" }}>Tổng tiền</th>
                  <th style={{ textAlign: "center" }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {unpaid.map((inv) => {
                  const room = rooms.find((r) => r.id === inv.room_id);
                  return (
                    <tr key={inv.id}>
                      <td>
                        <strong>{room?.room_number || "—"}</strong>
                      </td>
                      <td>
                        {inv.month}/{inv.year}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <strong>{fmtVND(inv.total_amount)}</strong>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Badge status={inv.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
    </div>
  );
}