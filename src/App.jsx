// src/App.js
import React, { useState, useCallback } from "react";
import { Home, Building2, Users, Receipt, ClipboardList, Wallet } from "lucide-react";
import { NAV_ITEMS } from "./constants";
import { useData } from "./hooks/useData";
import Toast from "./components/common/Toast";

// Import tất cả tabs
import TongQuan from "./components/tabs/TongQuan";
import NhaPhong from "./components/tabs/NhaPhong";
import KhachThue from "./components/tabs/KhachThue";
import HoaDon from "./components/tabs/HoaDon";
import DanhSachThu from "./components/tabs/DanhSachThu";
import ThuChi from "./components/tabs/ThuChi";

import "./styles/App.css";

// ============================================
// LOGO - NHỚ COPY ẢNH VÀO public/logo.png
// ============================================
const logo = "/logo.png";

function App() {
  const [tab, setTab] = useState("tongquan");
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((message, type = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const ctx = useData(notify);
  const { rooms, loading } = ctx;

  const getIcon = (name) => ({ Home, Building2, Users, Receipt, ClipboardList, Wallet }[name] || Home);

  const tabs = {
    tongquan: <TongQuan {...ctx} />,
    nha: <NhaPhong {...ctx} />,
    khach: <KhachThue {...ctx} />,
    hoadon: <HoaDon {...ctx} />,
    danhsachthu: <DanhSachThu {...ctx} />,
    thuchi: <ThuChi {...ctx} />
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          {/* ============================================ */}
          {/* LOGO - ĐÃ SỬA THÀNH ẢNH */}
          {/* ============================================ */}
          <div 
            className="brand-mark"
            style={{
              background: 'transparent',
              width: '42px',
              height: '42px',
              overflow: 'hidden',
              borderRadius: '10px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img 
              src={logo} 
              alt="Logo" 
              style={{ 
                width: '100%', 
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
            />
          </div>
          <div className="brand-text">
            <span>QUẢN LÝ TRỌ</span>
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
                <Icon size={18} strokeWidth={1.8} />
                <span>{n.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <p>{rooms.length} phòng</p>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {loading ? (
          <div className="loading-screen">Đang tải dữ liệu…</div>
        ) : (
          tabs[tab]
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map((n) => {
          const Icon = getIcon(n.icon);
          return (
            <button
              key={n.key}
              className={`bottom-nav-item ${tab === n.key ? "active" : ""}`}
              onClick={() => setTab(n.key)}
            >
              <Icon size={20} strokeWidth={tab === n.key ? 2.2 : 1.8} />
              <span>{n.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      <Toast toasts={toasts} />
    </div>
  );
}

export default App;