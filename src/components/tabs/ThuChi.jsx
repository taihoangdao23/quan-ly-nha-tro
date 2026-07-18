// src/components/tabs/ThuChi.jsx
import { useState, useMemo } from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, Filter, Calendar, DollarSign } from "lucide-react";
import EmptyState from "../common/EmptyState";
import ExpenseFormModal from "../modals/ExpenseFormModal";
import { fmtVND, fmtDate } from "../../utils/helpers";

export default function ThuChi({ rooms, invoices, expenses, loadAll, notify }) {
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState("all");

  const totalIncome = invoices.filter((i) => i.status === "da_thanh_toan").reduce((s, i) => s + Number(i.total_amount), 0);
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const profit = totalIncome - totalExpense;

  const combined = useMemo(() => {
    const incomeRows = invoices.filter((i) => i.status === "da_thanh_toan").map((i) => {
      const room = rooms.find((r) => r.id === i.room_id);
      return { type: "income", date: i.paid_date, label: `Tiền phòng ${room?.room_number || ""} — Tháng ${i.month}/${i.year}`, amount: i.total_amount };
    });
    const expenseRows = expenses.map((e) => ({ type: "expense", date: e.expense_date, label: e.note || e.category, amount: e.amount }));
    return [...incomeRows, ...expenseRows]
      .filter(row => filterType === "all" || row.type === filterType)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [invoices, expenses, rooms, filterType]);

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

      <div className="stats-grid stats-grid-3">
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><TrendingUp size={18} /></div>
          <div className="stat-info">
            <span className="stat-label">Tổng thu</span>
            <span className="stat-value text-green">{fmtVND(totalIncome)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-red"><TrendingDown size={18} /></div>
          <div className="stat-info">
            <span className="stat-label">Tổng chi</span>
            <span className="stat-value text-red">{fmtVND(totalExpense)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue"><Wallet size={18} /></div>
          <div className="stat-info">
            <span className="stat-label">Lợi nhuận</span>
            <span className="stat-value" style={{ color: profit >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
              {fmtVND(profit)}
            </span>
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <Filter size={16} />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="income">Thu</option>
            <option value="expense">Chi</option>
          </select>
        </div>
        <div className="filter-stats">
          <span>Số giao dịch: <strong>{combined.length}</strong></span>
        </div>
      </div>

      <div className="panel">
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
        <ExpenseFormModal rooms={rooms} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); loadAll(); notify("Đã ghi nhận chi phí"); }} notify={notify} />
      )}
    </div>
  );
}