// src/components/tabs/TongQuan.jsx
import { useState, useMemo, useRef } from "react";
import { 
  Building2, CheckCircle2, Circle, AlertCircle, Calendar, 
  Clock, AlertTriangle, Receipt, Send 
} from "lucide-react";
import html2canvas from "html2canvas";
import Badge from "../common/Badge";
import EmptyState from "../common/EmptyState";
import { fmtVND, fmtDate } from "../../utils/helpers";
import styles from "./TongQuan.module.css";

export default function TongQuan({ rooms, invoices, expenses, contracts, tenants, notify }) {
  const [copying, setCopying] = useState(false);
  const tableWrapRef = useRef(null);

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

  // ============================================================
  // TÍNH TOÁN DANH SÁCH GIA HẠN TẠM TRÚ
  // ============================================================
  const getExpiringTenants = () => {
    const expiringList = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoMonthsLater = new Date(today);
    twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);

    contracts.forEach((contract) => {
      if (contract.status !== "active") return;

      const room = rooms.find((r) => r.id === contract.room_id);
      if (!room) return;

      const tenantList = tenants.filter((t) => t.contract_id === contract.id);

      tenantList.forEach((tenant) => {
        if (!tenant.temp_residence_expiry) return;

        const expiryDate = new Date(tenant.temp_residence_expiry);
        expiryDate.setHours(0, 0, 0, 0);

        if (expiryDate >= today && expiryDate <= twoMonthsLater) {
          const diffTime = expiryDate - today;
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          expiringList.push({
            tenant: tenant,
            room: room,
            contract: contract,
            expiryDate: expiryDate,
            daysRemaining: daysRemaining,
            isUrgent: daysRemaining <= 30,
          });
        }
      });
    });

    expiringList.sort((a, b) => a.daysRemaining - b.daysRemaining);
    return expiringList;
  };

  const expiringTenants = getExpiringTenants();

  // ============================================================
  // TÍNH TOÁN DANH SÁCH THU TIỀN THÁNG HIỆN TẠI
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
          if (typeof notify === "function") {
            notify("Đã sao chép ảnh danh sách thu! Hãy dán (Ctrl+V) vào Zalo.");
          }
        } catch (err) {
          console.error(err);
          if (typeof notify === "function") {
            notify("Trình duyệt chặn sao chép ảnh.", "error");
          }
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
          1. PHẦN GIA HẠN TẠM TRÚ
          ============================================================ */}
      <div className={styles.expiringSection}>
        <div className={styles.expiringHeader}>
          <div className={styles.expiringTitle}>
            <AlertTriangle size={22} className={styles.expiringIcon} />
            <h2>Gia hạn tạm trú</h2>
            {expiringTenants.length > 0 && (
              <span className={styles.expiringCount}>{expiringTenants.length} khách</span>
            )}
          </div>
          <span className={styles.expiringWarning}>
            ⚠️ Cần gia hạn trong vòng 2 tháng
          </span>
        </div>

        {expiringTenants.length > 0 ? (
          <div className={styles.expiringList}>
            {expiringTenants.map((item, index) => (
              <div
                key={index}
                className={`${styles.expiringItem} ${item.isUrgent ? styles.urgent : ""}`}
              >
                <div className={styles.expiringRank}>#{index + 1}</div>
                <div className={styles.expiringInfo}>
                  <div className={styles.expiringName}>
                    {item.tenant.full_name}
                    <span className={styles.expiringRoom}>Phòng {item.room.room_number}</span>
                  </div>
                  <div className={styles.expiringDetails}>
                    <span>
                      <Calendar size={14} /> Hết hạn:{" "}
                      <strong>{fmtDate(item.expiryDate)}</strong>
                    </span>
                    <span
                      className={`${styles.expiringDays} ${
                        item.isUrgent ? styles.urgent : styles.warning
                      }`}
                    >
                      <Clock size={14} /> Còn <strong>{item.daysRemaining}</strong> ngày
                    </span>
                  </div>
                </div>
                <div className={styles.expiringStatus}>
                  <span
                    className={`${styles.statusTag} ${
                      item.isUrgent ? styles.urgent : styles.warning
                    }`}
                  >
                    {item.isUrgent ? "🔴 Khẩn cấp" : "🟡 Sắp hết hạn"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.expiringEmpty}>
            <CheckCircle2 size={32} color="#34a853" />
            <p>✅ Không có khách thuê nào sắp hết hạn tạm trú</p>
          </div>
        )}
      </div>

      {/* ============================================================
          2. DANH SÁCH THU TIỀN THÁNG HIỆN TẠI (NGAY SAU GIA HẠN TẠM TRÚ)
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
    </div>
  );
}