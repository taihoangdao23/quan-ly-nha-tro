// src/components/tabs/ThuChi.jsx
import { useState, useMemo } from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, Filter, Calendar, DollarSign, Zap, Droplet } from "lucide-react";
import EmptyState from "../common/EmptyState";
import ExpenseFormModal from "../modals/ExpenseFormModal";
import { fmtVND, fmtDate } from "../../utils/helpers";

export default function ThuChi({ rooms, invoices, expenses, loadAll, notify }) {
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Lọc hóa đơn theo tháng/năm được chọn
  const filteredInvoices = invoices.filter(
    (i) => i.month === selectedMonth && i.year === selectedYear
  );

  // Tính tổng tiền điện và nước từ hóa đơn
  const totalElectricity = filteredInvoices.reduce((sum, inv) => sum + Number(inv.electricity_amount || 0), 0);
  const totalWater = filteredInvoices.reduce((sum, inv) => sum + Number(inv.water_amount || 0), 0);

  // Tính tổng thu (đã thanh toán)
  const totalIncome = invoices
    .filter((i) => i.status === "da_thanh_toan")
    .reduce((s, i) => s + Number(i.total_amount), 0);

  // Tính tổng chi
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const profit = totalIncome - totalExpense;

  // Lọc theo loại thu/chi
  const combined = useMemo(() => {
    const incomeRows = invoices
      .filter((i) => i.status === "da_thanh_toan")
      .map((i) => {
        const room = rooms.find((r) => r.id === i.room_id);
        return {
          type: "income",
          date: i.paid_date,
          label: `Tiền phòng ${room?.room_number || ""} — Tháng ${i.month}/${i.year}`,
          amount: i.total_amount,
        };
      });
    
    const expenseRows = expenses.map((e) => ({
      type: "expense",
      date: e.expense_date,
      label: e.note || e.category,
      amount: e.amount,
    }));
    
    return [...incomeRows, ...expenseRows]
      .filter(row => filterType === "all" || row.type === filterType)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [invoices, expenses, rooms, filterType]);

  // Thống kê theo tháng
  const monthlyStats = useMemo(() => {
    const stats = {};
    invoices.forEach(inv => {
      const key = `${inv.month}/${inv.year}`;
      if (!stats[key]) {
        stats[key] = {
          month: inv.month,
          year: inv.year,
          electricity: 0,
          water: 0,
          total: 0,
          count: 0,
          paid: 0,
          unpaid: 0
        };
      }
      stats[key].electricity += Number(inv.electricity_amount || 0);
      stats[key].water += Number(inv.water_amount || 0);
      stats[key].total += Number(inv.total_amount || 0);
      stats[key].count += 1;
      if (inv.status === "da_thanh_toan") {
        stats[key].paid += Number(inv.total_amount || 0);
      } else {
        stats[key].unpaid += Number(inv.total_amount || 0);
      }
    });
    return Object.values(stats)
      .sort((a, b) => b.year - a.year || b.month - a.month)
      .slice(0, 6);
  }, [invoices]);

  // Stats data cho stat-grid (giống Danh sách thu)
  const statsData = [
    { 
      label: "Tổng thu", 
      value: fmtVND(totalIncome), 
      icon: TrendingUp, 
      color: "green",
      change: "+12%"
    },
    { 
      label: "Tổng chi", 
      value: fmtVND(totalExpense), 
      icon: TrendingDown, 
      color: "red",
      change: "-8%"
    },
    { 
      label: "Lợi nhuận", 
      value: fmtVND(profit), 
      icon: Wallet, 
      color: profit >= 0 ? "green" : "red",
      change: profit >= 0 ? "+15%" : "-5%"
    },
    { 
      label: `Tiền điện T${selectedMonth}/${selectedYear}`, 
      value: fmtVND(totalElectricity), 
      icon: Zap, 
      color: "orange",
      change: `${filteredInvoices.length} hóa đơn`
    },
    { 
      label: `Tiền nước T${selectedMonth}/${selectedYear}`, 
      value: fmtVND(totalWater), 
      icon: Droplet, 
      color: "blue",
      change: `${filteredInvoices.length} hóa đơn`
    },
  ];

  return (
    <div className="page">
      <header className="page-head row-between">
        <div>
          <h1>💰 Thu chi</h1>
          <p>Tổng hợp các khoản thu từ tiền phòng và chi phí vận hành</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Thêm chi phí
        </button>
      </header>

      {/* Bộ lọc tháng/năm */}
      <div className="filter-bar">
        <div className="filter-group">
          <Calendar size={16} />
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="income">Thu</option>
            <option value="expense">Chi</option>
          </select>
        </div>
      </div>

      {/* Stats Grid - Giống Danh sách thu */}
      <div className="stats-grid stats-grid-5">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="stat-card">
              <div className={`stat-icon stat-icon-${stat.color}`}>
                <Icon size={18} />
              </div>
              <div className="stat-info">
                <span className="stat-label">{stat.label}</span>
                <span className="stat-value">{stat.value}</span>
                <span className={`stat-change ${stat.change.startsWith('+') ? 'up' : 'down'}`}>
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Thống kê theo tháng */}
      <div className="panel">
        <h3>📊 Thống kê theo tháng</h3>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Tháng</th>
                <th style={{ textAlign: "right" }}>Tiền điện</th>
                <th style={{ textAlign: "right" }}>Tiền nước</th>
                <th style={{ textAlign: "right" }}>Tổng hóa đơn</th>
                <th style={{ textAlign: "center" }}>Số hóa đơn</th>
                <th style={{ textAlign: "right" }}>Đã thu</th>
                <th style={{ textAlign: "right" }}>Chưa thu</th>
              </tr>
            </thead>
            <tbody>
              {monthlyStats.length > 0 ? (
                monthlyStats.map((stat, index) => (
                  <tr key={index}>
                    <td><strong>{stat.month}/{stat.year}</strong></td>
                    <td style={{ textAlign: "right" }}>{fmtVND(stat.electricity)}</td>
                    <td style={{ textAlign: "right" }}>{fmtVND(stat.water)}</td>
                    <td style={{ textAlign: "right" }}><strong>{fmtVND(stat.total)}</strong></td>
                    <td style={{ textAlign: "center" }}>{stat.count}</td>
                    <td style={{ textAlign: "right", color: 'var(--secondary)' }}>{fmtVND(stat.paid)}</td>
                    <td style={{ textAlign: "right", color: 'var(--danger)' }}>{fmtVND(stat.unpaid)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "20px 0" }}>Chưa có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lịch sử giao dịch */}
      <div className="panel">
        <h3>📋 Lịch sử giao dịch</h3>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Nội dung</th>
                <th style={{ textAlign: "center" }}>Loại</th>
                <th style={{ textAlign: "right" }}>Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {combined.map((row, idx) => (
                <tr key={idx}>
                  <td>{fmtDate(row.date)}</td>
                  <td>{row.label}</td>
                  <td style={{ textAlign: "center" }}>
                    <span className={row.type === "income" ? "tag-income" : "tag-expense"}>
                      {row.type === "income" ? "Thu" : "Chi"}
                    </span>
                  </td>
                  <td className={row.type === "income" ? "text-green" : "text-red"} style={{ textAlign: "right" }}>
                    {row.type === "income" ? "+" : "-"}{fmtVND(row.amount)}
                  </td>
                </tr>
              ))}
              {combined.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: "40px 0" }}>
                  <EmptyState icon={Wallet} title="Chưa có giao dịch nào" />
                </td></tr>
              )}
            </tbody>
            {combined.length > 0 && (
              <tfoot>
                <tr style={{ fontWeight: 700, background: "var(--bg)" }}>
                  <td colSpan={3} style={{ textAlign: "right" }}>TỔNG CỘNG</td>
                  <td style={{ textAlign: "right" }}>
                    {fmtVND(combined.reduce((s, r) => s + (r.type === "income" ? r.amount : -r.amount), 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showModal && (
        <ExpenseFormModal 
          rooms={rooms} 
          onClose={() => setShowModal(false)} 
          onSaved={() => { 
            setShowModal(false); 
            loadAll(); 
            notify("Đã ghi nhận chi phí"); 
          }} 
          notify={notify} 
        />
      )}
    </div>
  );
}