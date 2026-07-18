// src/components/tabs/DanhSachThu.jsx
import { useState, useMemo } from "react";
import { Receipt, CheckCircle2, Circle, Download, Search, Filter, FileSpreadsheet } from "lucide-react";
import EmptyState from "../common/EmptyState";
import { MONTHS, YEARS, THIS_YEAR } from "../../constants";
import { fmtVND } from "../../utils/helpers";

export default function DanhSachThu({ rooms, contracts, tenants, invoices, loadAll, notify }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(THIS_YEAR);
  const [searchText, setSearchText] = useState("");

  const occupiedRooms = rooms.filter((r) => r.status === "da_thue");

  const tableData = useMemo(() => {
    return occupiedRooms.map((room) => {
      const activeContract = contracts.find((c) => c.room_id === room.id && c.status === "active");
      let representative = null;
      if (activeContract) {
        const reps = tenants.filter((t) => t.contract_id === activeContract.id && t.is_representative === true);
        representative = reps.length > 0 ? reps[0] : tenants.filter((t) => t.contract_id === activeContract.id)[0];
      }
      const invoice = invoices.find((i) => i.room_id === room.id && i.month === selectedMonth && i.year === selectedYear);
      return {
        roomId: room.id,
        roomNumber: room.room_number,
        representative: representative?.full_name || "Chưa có",
        totalAmount: invoice ? invoice.total_amount : 0,
        hasInvoice: !!invoice,
        status: invoice?.status || "chua_thanh_toan",
      };
    });
  }, [occupiedRooms, contracts, tenants, invoices, selectedMonth, selectedYear]);

  const filteredData = useMemo(() => {
    if (!searchText.trim()) return tableData;
    const search = searchText.toLowerCase().trim();
    return tableData.filter(
      (item) => item.roomNumber.toLowerCase().includes(search) || item.representative.toLowerCase().includes(search)
    );
  }, [tableData, searchText]);

  const totalAmount = filteredData.reduce((sum, item) => sum + Number(item.totalAmount), 0);
  const collectedAmount = filteredData.filter(i => i.status === "da_thanh_toan").reduce((sum, item) => sum + Number(item.totalAmount), 0);

  const exportToCSV = () => {
    if (filteredData.length === 0) return notify("Không có dữ liệu để xuất", "error");
    const headers = ["STT", "Phòng", "Chủ hộ/Đại diện", "Tổng tiền", "Trạng thái"];
    const rows = filteredData.map((item, index) => [
      index + 1, item.roomNumber, item.representative, item.totalAmount || 0,
      item.status === "da_thanh_toan" ? "Đã thanh toán" : "Chưa thanh toán"
    ]);
    let csvContent = headers.join(",") + "\n" + rows.map(row => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `danh-sach-thu-${selectedMonth}-${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    notify("Đã xuất file CSV");
  };

  return (
    <div className="page">
      <header className="page-head row-between">
        <div>
          <h1>📋 Danh sách thu</h1>
          <p>Danh sách tất cả các phòng và số tiền thu theo tháng</p>
        </div>
        <button className="btn-primary" onClick={exportToCSV}>
          <FileSpreadsheet size={16} /> Xuất Excel
        </button>
      </header>

      <div className="filter-bar">
        <div className="filter-group">
          <Filter size={16} />
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
            {MONTHS.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="search-bar">
          <Search size={16} />
          <input placeholder="Tìm theo phòng hoặc tên..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        </div>
      </div>

      <div className="stats-grid stats-grid-3">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue"><Receipt size={18} /></div>
          <div className="stat-info">
            <span className="stat-label">Tổng số phòng</span>
            <span className="stat-value">{filteredData.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><CheckCircle2 size={18} /></div>
          <div className="stat-info">
            <span className="stat-label">Tổng tiền thu</span>
            <span className="stat-value text-green">{fmtVND(totalAmount)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-orange"><Circle size={18} /></div>
          <div className="stat-info">
            <span className="stat-label">Đã thu</span>
            <span className="stat-value">{fmtVND(collectedAmount)}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>STT</th>
                <th>Phòng</th>
                <th>Chủ hộ/Đại diện</th>
                <th style={{ textAlign: "right" }}>Tổng tiền</th>
                <th style={{ textAlign: "center" }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "40px 0" }}>
                  <EmptyState icon={Receipt} title="Không có dữ liệu" hint="Không có phòng nào đang thuê hoặc chưa có hóa đơn" />
                </td></tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.roomId}>
                    <td>{index + 1}</td>
                    <td><strong>{item.roomNumber}</strong></td>
                    <td>{item.representative}</td>
                    <td style={{ textAlign: "right" }}><strong>{item.hasInvoice ? fmtVND(item.totalAmount) : "—"}</strong></td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`status-badge ${item.status === "da_thanh_toan" ? "rented" : "empty"}`}>
                        {item.status === "da_thanh_toan" ? "✅ Đã thu" : "⏳ Chưa thu"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredData.length > 0 && (
              <tfoot>
                <tr style={{ fontWeight: 700, background: "var(--bg)" }}>
                  <td colSpan={3} style={{ textAlign: "right" }}>TỔNG CỘNG</td>
                  <td style={{ textAlign: "right" }}>{fmtVND(totalAmount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}