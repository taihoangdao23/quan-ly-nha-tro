// src/components/tabs/DanhSachThu.jsx
import { useState, useMemo, useRef } from "react";
import { Receipt, CheckCircle2, Circle, Search, Filter, FileSpreadsheet, Send } from "lucide-react";
import html2canvas from "html2canvas";
import EmptyState from "../common/EmptyState";
import { MONTHS, YEARS, THIS_YEAR } from "../../constants";
import { fmtVND } from "../../utils/helpers";

export default function DanhSachThu({ rooms, contracts, tenants, invoices, loadAll, notify }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(THIS_YEAR);
  const [searchText, setSearchText] = useState("");
  const [copying, setCopying] = useState(false);

  const tableWrapRef = useRef(null);

  const occupiedRooms = useMemo(() => {
    return rooms.filter((r) => r.status === "da_thue");
  }, [rooms]);

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
    const headers = ["Phòng", "Chủ hộ/Đại diện", "Tổng tiền"];
    const rows = filteredData.map((item) => [
      item.roomNumber,
      item.representative,
      item.totalAmount || 0,
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

  const handleCopyImage = async () => {
    if (filteredData.length === 0) {
      return notify("Không có dữ liệu để gửi", "error");
    }
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
          // Khởi tạo phần tử được chụp trong DOM ảo (cloned DOM)
          const clonedEl = clonedDoc.querySelector(`[data-capture="danh-sach-thu"]`);
          if (clonedEl) {
            // Ép khung chụp về kích thước Mobile thon gọn (430px) để đồng bộ mọi thiết bị
            clonedEl.style.width = "430px";
            clonedEl.style.maxWidth = "430px";
            clonedEl.style.minWidth = "430px";
            clonedEl.style.borderRadius = "0px"; // Cho thẳng viền chuẩn biên nhận di động
            clonedEl.style.boxSizing = "border-box";
            clonedEl.style.padding = "24px 16px";
          }

          const clonedTableScroll = clonedDoc.querySelector(".table-scroll");
          if (clonedTableScroll) {
            clonedTableScroll.style.overflow = "visible";
            clonedTableScroll.style.maxHeight = "none";
          }

          // Căn chỉnh chữ bảng cho khít và đẹp mắt trong khung hẹp
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
          return notify("Không thể tạo ảnh", "error");
        }
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          notify("Đã sao chép ảnh danh sách thu (bản Mobile)! Hãy dán (Ctrl+V) vào Zalo.");
        } catch (err) {
          console.error(err);
          notify("Trình duyệt chặn sao chép ảnh. Hãy cấp quyền Clipboard cho trang web.", "error");
        }
        setCopying(false);
      }, "image/png");
    } catch (e) {
      console.error(e);
      notify("Có lỗi khi tạo ảnh danh sách", "error");
      setCopying(false);
    }
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
        {/* Khung được chụp làm ảnh (được gán data-capture="danh-sach-thu" để style lại trên DOM ảo) */}
        <div 
          ref={tableWrapRef} 
          data-capture="danh-sach-thu"
          style={{ 
            background: "#ffffff", 
            padding: "20px 20px 24px 20px", 
            borderRadius: "8px",
            boxSizing: "border-box" 
          }}
        >
          <div style={{ marginBottom: "14px", borderBottom: "2px solid #e5e7eb", paddingBottom: "10px" }}>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#111827" }}>
              DANH SÁCH THU TIỀN THÁNG {selectedMonth}/{selectedYear}
            </h3>
          </div>
          <div className="table-scroll">
            <table className="table" style={{ width: "100%", color: "#111827", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", color: "#111827", padding: "10px 8px" }}>Phòng</th>
                  <th style={{ textAlign: "left", color: "#111827", padding: "10px 8px" }}>Chủ hộ/Đại diện</th>
                  <th style={{ textAlign: "right", color: "#111827", padding: "10px 8px" }}>Tổng tiền</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", padding: "40px 0" }}>
                      <EmptyState icon={Receipt} title="Không có dữ liệu" hint="Không có phòng nào đang thuê hoặc chưa có hóa đơn" />
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.roomId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ color: "#111827", padding: "10px 8px" }}><strong>{item.roomNumber}</strong></td>
                      <td style={{ color: "#111827", padding: "10px 8px" }}>{item.representative}</td>
                      <td style={{ textAlign: "right", color: "#111827", padding: "10px 8px" }}>
                        <strong>{item.hasInvoice ? fmtVND(item.totalAmount) : "—"}</strong>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredData.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 700, background: "#f9fafb", color: "#111827", borderTop: "2px solid #e5e7eb" }}>
                    <td colSpan={2} style={{ textAlign: "right", padding: "12px 8px" }}>TỔNG CỘNG</td>
                    <td style={{ textAlign: "right", padding: "12px 8px" }}>{fmtVND(totalAmount)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Nút gửi danh sách */}
        {filteredData.length > 0 && (
          <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
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
    </div>
  );
}