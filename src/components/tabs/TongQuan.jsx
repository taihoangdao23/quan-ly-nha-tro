// src/components/tabs/TongQuan.jsx
import { Building2, CheckCircle2, Circle, AlertCircle, Calendar, Clock, AlertTriangle, Users, Home } from "lucide-react";
import Badge from "../common/Badge";
import { fmtVND, fmtDate } from "../../utils/helpers";
import styles from "./TongQuan.module.css";

export default function TongQuan({ rooms, invoices, expenses, contracts, tenants }) {
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

  // ============================================================
  // TÍNH TOÁN DANH SÁCH GIA HẠN TẠM TRÚ
  // ============================================================
  const getExpiringTenants = () => {
    const expiringList = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoMonthsLater = new Date(today);
    twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);

    // Duyệt qua tất cả hợp đồng đang hoạt động
    contracts.forEach(contract => {
      if (contract.status !== "active") return;
      
      // Tìm phòng của hợp đồng
      const room = rooms.find(r => r.id === contract.room_id);
      if (!room) return;
      
      // Lấy danh sách khách thuê trong hợp đồng
      const tenantList = tenants.filter(t => t.contract_id === contract.id);
      
      tenantList.forEach(tenant => {
        // Kiểm tra nếu có ngày hết hạn tạm trú
        if (!tenant.temp_residence_expiry) return;
        
        const expiryDate = new Date(tenant.temp_residence_expiry);
        expiryDate.setHours(0, 0, 0, 0);
        
        // Kiểm tra nếu ngày hết hạn trong vòng 2 tháng tới (tính từ hôm nay)
        if (expiryDate >= today && expiryDate <= twoMonthsLater) {
          // Tính số ngày còn lại
          const diffTime = expiryDate - today;
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          expiringList.push({
            tenant: tenant,
            room: room,
            contract: contract,
            expiryDate: expiryDate,
            daysRemaining: daysRemaining,
            isUrgent: daysRemaining <= 30 // Còn 30 ngày là khẩn cấp
          });
        }
      });
    });
    
    // Sắp xếp theo số ngày còn lại tăng dần (người gần nhất lên đầu)
    expiringList.sort((a, b) => a.daysRemaining - b.daysRemaining);
    
    return expiringList;
  };

  const expiringTenants = getExpiringTenants();

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
      change: `+${occupied > 0 ? Math.round(occupied / rooms.length * 100) : 0}%`,
    },
    {
      title: "Phòng trống",
      value: empty,
      icon: Circle,
      color: "orange",
      change: empty > 0 ? `${Math.round(empty / rooms.length * 100)}%` : "0%",
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
        <p>Tình hình nhà trọ tháng {now.getMonth() + 1}/{now.getFullYear()}</p>
      </header>

      {/* ============================================================
          PHẦN GIA HẠN TẠM TRÚ - ĐẶT LÊN ĐẦU TRANG
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
              <div key={index} className={`${styles.expiringItem} ${item.isUrgent ? styles.urgent : ''}`}>
                <div className={styles.expiringRank}>#{index + 1}</div>
                <div className={styles.expiringInfo}>
                  <div className={styles.expiringName}>
                    {item.tenant.full_name}
                    <span className={styles.expiringRoom}>Phòng {item.room.room_number}</span>
                  </div>
                  <div className={styles.expiringDetails}>
                    <span>
                      <Calendar size={14} /> Hết hạn: <strong>{fmtDate(item.expiryDate)}</strong>
                    </span>
                    <span className={`${styles.expiringDays} ${item.isUrgent ? styles.urgent : styles.warning}`}>
                      <Clock size={14} /> Còn <strong>{item.daysRemaining}</strong> ngày
                    </span>
                  </div>
                </div>
                <div className={styles.expiringStatus}>
                  <span className={`${styles.statusTag} ${item.isUrgent ? styles.urgent : styles.warning}`}>
                    {item.isUrgent ? '🔴 Khẩn cấp' : '🟡 Sắp hết hạn'}
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
            <strong className="text-green">{fmtVND(expectedThisMonth - thisMonthExpenses)}</strong>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${expectedThisMonth ? Math.min(100, (collected / expectedThisMonth) * 100) : 0}%`,
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
            {rooms.filter((r) => r.status === "trong").map((r) => (
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
                  <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                  <th style={{ textAlign: 'center' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {unpaid.map((inv) => {
                  const room = rooms.find((r) => r.id === inv.room_id);
                  return (
                    <tr key={inv.id}>
                      <td><strong>{room?.room_number || "—"}</strong></td>
                      <td>{inv.month}/{inv.year}</td>
                      <td style={{ textAlign: 'right' }}><strong>{fmtVND(inv.total_amount)}</strong></td>
                      <td style={{ textAlign: 'center' }}><Badge status={inv.status} /></td>
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