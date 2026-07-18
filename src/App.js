// src/App.js
import React, { useState, useCallback } from "react";
import { 
  Home, 
  Building2, 
  Users, 
  Receipt, 
  ClipboardList, 
  Wallet,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  TrendingUp,
  Activity,
  Award,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";

// Constants
import { NAV_ITEMS } from "./constants";

// Hooks
import { useData } from "./hooks/useData";

// Components
import Toast from "./components/common/Toast";

// Tabs
import TongQuan from "./components/tabs/TongQuan";
import NhaPhong from "./components/tabs/NhaPhong";
import KhachThue from "./components/tabs/KhachThue";
import HoaDon from "./components/tabs/HoaDon";
import DanhSachThu from "./components/tabs/DanhSachThu";
import ThuChi from "./components/tabs/ThuChi";

// Styles
import "./styles/App.css";

function App() {
  const [tab, setTab] = useState("tongquan");
  const [toasts, setToasts] = useState([]);

  // Hàm hiển thị thông báo
  const notify = useCallback((message, type = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  // Lấy dữ liệu từ hook
  const ctx = useData(notify);
  const { rooms, contracts, tenants, invoices, loading } = ctx;

  // Hàm lấy icon theo tên
  const getIcon = (iconName) => {
    const icons = {
      Home,
      Building2,
      Users,
      Receipt,
      ClipboardList,
      Wallet
    };
    return icons[iconName] || Home;
  };

  // Dashboard Content theo phong cách ảnh mẫu
  const DashboardContent = () => {
    // Tính toán thống kê
    const occupied = rooms.filter(r => r.status === "da_thue").length;
    const empty = rooms.length - occupied;
    
    // Tính tổng khách thuê
    let totalTenants = 0;
    contracts.forEach(c => {
      if (c.status === "active") {
        const tenantList = tenants.filter(t => t.contract_id === c.id);
        totalTenants += tenantList.length;
      }
    });

    // Tính tổng doanh thu tháng này
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const monthInvoices = invoices.filter(i => i.month === month && i.year === year);
    const totalRevenue = monthInvoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
    const collectedRevenue = monthInvoices
      .filter(i => i.status === "da_thanh_toan")
      .reduce((sum, i) => sum + Number(i.total_amount || 0), 0);

    // Dữ liệu cho stats
    const stats = [
      { 
        icon: Users, 
        label: "Tổng khách thuê", 
        value: totalTenants, 
        change: `+${totalTenants > 0 ? Math.round(totalTenants / 3) : 0}%`, 
        color: "blue",
        trend: "up"
      },
      { 
        icon: Building2, 
        label: "Phòng đã thuê", 
        value: occupied, 
        change: `+${occupied > 0 ? Math.round(occupied / rooms.length * 100) : 0}%`, 
        color: "green",
        trend: "up"
      },
      { 
        icon: Home, 
        label: "Phòng trống", 
        value: empty, 
        change: empty > 0 ? `${Math.round(empty / rooms.length * 100)}%` : "0%", 
        color: "orange",
        trend: empty > 3 ? "down" : "up"
      },
      { 
        icon: DollarSign, 
        label: "Doanh thu tháng", 
        value: (totalRevenue / 1000000).toFixed(1) + "M", 
        change: collectedRevenue > 0 ? `${Math.round(collectedRevenue / totalRevenue * 100)}%` : "0%",
        color: "red",
        trend: collectedRevenue > totalRevenue * 0.5 ? "up" : "down"
      },
    ];

    // Dữ liệu cho top phòng
    const topRooms = rooms.slice(0, 3).map((room, index) => {
      const contract = contracts.find(c => c.room_id === room.id && c.status === "active");
      const tenantCount = contract ? tenants.filter(t => t.contract_id === contract.id).length : 0;
      const fillRate = room.rent_price > 0 ? Math.min(100, (tenantCount / 2) * 100) : 0;
      return {
        room: room.room_number,
        tenants: tenantCount,
        rate: fillRate.toFixed(1),
        rank: index + 1
      };
    });

    // Dữ liệu hoạt động gần đây (từ invoices)
    const recentActivities = invoices.slice(0, 3).map(inv => {
      const room = rooms.find(r => r.id === inv.room_id);
      const status = inv.status === "da_thanh_toan" ? "đã thanh toán" : "chưa thanh toán";
      return {
        room: room?.room_number || "Unknown",
        action: status,
        time: `Tháng ${inv.month}/${inv.year}`,
        amount: inv.total_amount
      };
    });

    return (
      <div className="dashboard">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-left">
            <h1>🏠 Bảng điều khiển</h1>
            <p>Quản lý nhà trọ thông minh</p>
          </div>
          <div className="header-right">
            <div className="search-box">
              <Search size={18} />
              <input type="text" placeholder="Tìm kiếm..." />
            </div>
            <button className="icon-btn">
              <Bell size={20} />
              <span className="badge-dot"></span>
            </button>
            <div className="user-avatar">
              <span>QL</span>
            </div>
          </div>
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
                  <span className="stat-label">{stat.label}</span>
                  <span className="stat-value">{stat.value}</span>
                  <span className={`stat-change ${stat.trend === 'up' ? 'up' : 'down'}`}>
                    {stat.change}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Grid - 2 columns */}
        <div className="dashboard-grid">
          {/* Left Column */}
          <div className="grid-left">
            {/* Calendar */}
            <div className="card calendar-card">
              <div className="card-header">
                <h3>📅 Lịch & Sự kiện</h3>
                <div className="card-actions">
                  <span className="date-label">Tháng {now.getMonth() + 1}, {now.getFullYear()}</span>
                  <button className="icon-btn small"><ChevronLeft size={16} /></button>
                  <button className="icon-btn small"><ChevronRight size={16} /></button>
                </div>
              </div>
              <div className="calendar-grid">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
                  <div key={day} className="day-name">{day}</div>
                ))}
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                  const isToday = day === new Date().getDate();
                  const isEvent = [5, 12, 18, 25].includes(day);
                  const isExam = [8, 22].includes(day);
                  return (
                    <div 
                      key={day} 
                      className={`day ${isToday ? 'today' : ''} ${isEvent ? 'has-event' : ''} ${isExam ? 'exam' : ''}`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
              <div className="calendar-legend">
                <span><span className="dot blue"></span> Sự kiện</span>
                <span><span className="dot red"></span> Thanh toán</span>
                <span><span className="dot green"></span> Hôm nay</span>
              </div>
            </div>

            {/* Top Rooms */}
            <div className="card">
              <div className="card-header">
                <h3>🏆 Phòng có tỷ lệ lấp đầy cao nhất</h3>
                <button className="view-all">Xem tất cả</button>
              </div>
              <div className="top-scorers">
                {topRooms.length > 0 ? (
                  topRooms.map((item, index) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <div key={index} className="scorer-item">
                        <div className="scorer-rank">{medals[index]}</div>
                        <div className="scorer-info">
                          <div className="scorer-name">Phòng {item.room}</div>
                          <div className="scorer-school">{item.tenants} người ở</div>
                        </div>
                        <div className="scorer-score">{item.rate}%</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-state-small">Chưa có dữ liệu</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="grid-right">
            {/* Recent Activities */}
            <div className="card">
              <div className="card-header">
                <h3>📋 Hoạt động gần đây</h3>
                <button className="view-all">Xem tất cả</button>
              </div>
              <div className="activity-list">
                {recentActivities.length > 0 ? (
                  recentActivities.map((item, index) => (
                    <div key={index} className="activity-item">
                      <div className={`activity-avatar ${item.action === 'đã thanh toán' ? 'green' : 'orange'}`}>
                        {item.room.charAt(0)}
                      </div>
                      <div className="activity-info">
                        <div className="activity-title">Phòng {item.room}</div>
                        <div className="activity-desc">
                          {item.action === 'đã thanh toán' ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}
                          <span className="activity-amount">
                            {new Intl.NumberFormat('vi-VN').format(item.amount || 0)}đ
                          </span>
                        </div>
                        <div className="activity-time">{item.time}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state-small">Chưa có hoạt động</div>
                )}
              </div>
            </div>

            {/* Fee Structure / Room Status */}
            <div className="card">
              <div className="card-header">
                <h3>💰 Tình trạng phòng</h3>
                <button className="view-all">Xem tất cả</button>
              </div>
              <div className="fee-list">
                {rooms.slice(0, 4).map(room => {
                  const contract = contracts.find(c => c.room_id === room.id && c.status === "active");
                  const tenantCount = contract ? tenants.filter(t => t.contract_id === contract.id).length : 0;
                  return (
                    <div key={room.id} className="fee-item">
                      <div className="fee-room">{room.room_number}</div>
                      <div className="fee-tenants">{tenantCount} người</div>
                      <div className="fee-price">
                        {new Intl.NumberFormat('vi-VN').format(room.rent_price || 0)}đ
                      </div>
                      <div className="fee-status">
                        <span className={`status-badge ${room.status === 'da_thue' ? 'rented' : 'empty'}`}>
                          {room.status === 'da_thue' ? 'Đã thuê' : 'Trống'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Map tabs
  const tabs = {
    tongquan: <DashboardContent />,
    nha: <NhaPhong {...ctx} />,
    khach: <KhachThue {...ctx} />,
    hoadon: <HoaDon {...ctx} />,
    danhsachthu: <DanhSachThu {...ctx} />,
    thuchi: <ThuChi {...ctx} />
  };

  return (
    <div className="app-shell">
      {/* Sidebar - Menu bên trái */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">QT</div>
          <div className="brand-text">
            <strong>QL <span className="highlight">Trọ</span></strong>
          </div>
        </div>
        <nav className="nav">
          {NAV_ITEMS.map((n) => {
            const Icon = getIcon(n.icon);
            return (
              <button
                key={n.key}
                className={`nav-item ${tab === n.key ? "active" : ""}`}
                onClick={() => setTab(n.key)}
              >
                <Icon size={20} />
                <span>{n.label}</span>
                {n.key === "tongquan" && <span className="nav-badge">New</span>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="user-card">
            <div className="avatar">QL</div>
            <div className="user-info">
              <div className="name">Quản lý</div>
              <div className="role">Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">
        {loading ? (
          <div className="loading-screen">Đang tải dữ liệu…</div>
        ) : (
          tabs[tab]
        )}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map((n) => {
          const Icon = getIcon(n.icon);
          return (
            <button
              key={n.key}
              className={`bottom-nav-item ${tab === n.key ? "active" : ""}`}
              onClick={() => setTab(n.key)}
            >
              <Icon size={22} strokeWidth={tab === n.key ? 2.2 : 1.8} />
              <span>{n.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Toast Notifications */}
      <Toast toasts={toasts} />
    </div>
  );
}

export default App;