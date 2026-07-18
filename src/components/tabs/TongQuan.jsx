// src/components/tabs/TongQuan.jsx
import { Building2, CheckCircle2, Circle, AlertCircle, TrendingUp, TrendingDown, DollarSign, Home, Users } from "lucide-react";
import Badge from "../common/Badge";
import { fmtVND } from "../../utils/helpers";

export default function TongQuan({ rooms, invoices, expenses }) {
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

  const stats = [
    {
      title: "Tổng số phòng",
      value: rooms.length,
      icon: Building2,
      color: "blue",
      change: `+0%`,
      changeLabel: "so với tháng trước"
    },
    {
      title: "Đang thuê",
      value: occupied,
      icon: CheckCircle2,
      color: "green",
      change: `+${occupied > 0 ? Math.round(occupied / rooms.length * 100) : 0}%`,
      changeLabel: "tỷ lệ lấp đầy"
    },
    {
      title: "Phòng trống",
      value: empty,
      icon: Circle,
      color: "orange",
      change: empty > 0 ? `${Math.round(empty / rooms.length * 100)}%` : "0%",
      changeLabel: "còn trống"
    },
    {
      title: "Hóa đơn chưa thu",
      value: fmtVND(unpaidTotal),
      icon: AlertCircle,
      color: "red",
      change: `+${unpaid.length}`,
      changeLabel: "hóa đơn chưa thanh toán"
    },
  ];

  return (
    <div className="page">
      <header className="page-head">
        <h1>📊 Tổng quan</h1>
        <p>Tình hình nhà trọ tháng {now.getMonth() + 1}/{now.getFullYear()}</p>
      </header>

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
                <span className={`stat-change ${stat.change.startsWith('+') ? 'up' : 'down'}`}>
                  {stat.change} {stat.changeLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout */}
      <div className="two-col">
        {/* Left Column - Revenue */}
        <div className="panel revenue-panel">
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
        <div className="panel empty-rooms-panel">
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
        <div className="panel invoice-panel">
          <div className="invoice-header">
            <h3>📄 Hóa đơn chưa thanh toán ({unpaid.length})</h3>
            <span className="invoice-total-badge">
              Tổng: {fmtVND(unpaidTotal)}
            </span>
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
                      <td>
                        <strong>{room?.room_number || "—"}</strong>
                      </td>
                      <td>{inv.month}/{inv.year}</td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{fmtVND(inv.total_amount)}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
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