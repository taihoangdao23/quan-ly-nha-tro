// ============================================================
// THÊM TAB MỚI VÀO NAVIGATION
// ============================================================
// Thêm vào NAV array trong App component:

const NAV = [
  { key: "nha", label: "Nhà & phòng", shortLabel: "Nhà/phòng", icon: Building2 },
  { key: "tongquan", label: "Tổng quan", shortLabel: "Tổng quan", icon: Home },
  { key: "khach", label: "Khách thuê", shortLabel: "Khách", icon: Users },
  { key: "hoadon", label: "Hóa đơn", shortLabel: "Hóa đơn", icon: Receipt },
  { key: "danhsachthu", label: "Danh sách thu", shortLabel: "Danh sách thu", icon: ClipboardList }, // TAB MỚI
  { key: "thuchi", label: "Thu chi", shortLabel: "Thu chi", icon: Wallet },
];

// ============================================================
// THÊM COMPONENT DANH SÁCH THU
// ============================================================
function DanhSachThu({ rooms, contracts, tenants, invoices, utilityReadings, loadAll, notify }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(THIS_YEAR);
  const [searchText, setSearchText] = useState("");

  // Lấy danh sách phòng đã thuê
  const occupiedRooms = rooms.filter((r) => r.status === "da_thue");

  // Tạo dữ liệu cho bảng
  const tableData = useMemo(() => {
    return occupiedRooms.map((room) => {
      // Tìm hợp đồng active của phòng
      const activeContract = contracts.find(
        (c) => c.room_id === room.id && c.status === "active"
      );
      
      // Tìm người đại diện
      let representative = null;
      if (activeContract) {
        const reps = tenants.filter(
          (t) => t.contract_id === activeContract.id && t.is_representative === true
        );
        if (reps.length > 0) {
          representative = reps[0];
        } else {
          // Nếu không có đại diện, lấy người đầu tiên
          const allTenants = tenants.filter((t) => t.contract_id === activeContract.id);
          if (allTenants.length > 0) {
            representative = allTenants[0];
          }
        }
      }

      // Tìm hóa đơn của tháng được chọn
      const invoice = invoices.find(
        (i) => i.room_id === room.id && i.month === selectedMonth && i.year === selectedYear
      );

      return {
        roomId: room.id,
        roomNumber: room.room_number,
        representative: representative?.full_name || "Chưa có",
        rentPrice: room.rent_price,
        invoice: invoice || null,
        totalAmount: invoice ? invoice.total_amount : 0,
        status: invoice?.status || "chua_co_hoa_don",
        hasInvoice: !!invoice,
      };
    });
  }, [occupiedRooms, contracts, tenants, invoices, selectedMonth, selectedYear]);

  // Lọc theo tìm kiếm
  const filteredData = useMemo(() => {
    if (!searchText.trim()) return tableData;
    const search = searchText.toLowerCase().trim();
    return tableData.filter(
      (item) =>
        item.roomNumber.toLowerCase().includes(search) ||
        item.representative.toLowerCase().includes(search)
    );
  }, [tableData, searchText]);

  // Tính tổng tiền
  const totalAmount = filteredData.reduce((sum, item) => sum + Number(item.totalAmount), 0);
  const totalPaid = filteredData
    .filter((item) => item.status === "da_thanh_toan")
    .reduce((sum, item) => sum + Number(item.totalAmount), 0);
  const totalUnpaid = filteredData
    .filter((item) => item.status === "chua_thanh_toan")
    .reduce((sum, item) => sum + Number(item.totalAmount), 0);

  // Xuất Excel (đơn giản)
  const exportToCSV = () => {
    if (filteredData.length === 0) return notify("Không có dữ liệu để xuất", "error");
    
    const headers = ["STT", "Phòng", "Chủ hộ/Đại diện", "Tiền phòng", "Tiền điện", "Tiền nước", "Tiền rác", "Tổng tiền", "Trạng thái"];
    const rows = filteredData.map((item, index) => [
      index + 1,
      item.roomNumber,
      item.representative,
      item.rentPrice || 0,
      item.invoice?.electricity_amount || 0,
      item.invoice?.water_amount || 0,
      item.invoice?.trash_amount || 0,
      item.totalAmount || 0,
      item.status === "da_thanh_toan" ? "Đã thanh toán" : 
      item.status === "chua_thanh_toan" ? "Chưa thanh toán" : "Chưa có hóa đơn"
    ]);

    let csvContent = headers.join(",") + "\n";
    rows.forEach(row => {
      csvContent += row.join(",") + "\n";
    });

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
          <h1>Danh sách thu</h1>
          <p>Danh sách tất cả các phòng và số tiền thu theo tháng</p>
        </div>
        <button className="btn-primary" onClick={exportToCSV}>
          <Download size={16} /> Xuất Excel
        </button>
      </header>

      <div className="filter-bar">
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>Tháng {m}</option>
          ))}
        </select>
        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <div className="search-bar" style={{ flex: 1, maxWidth: 300 }}>
          <Search size={16} />
          <input
            placeholder="Tìm theo phòng hoặc tên..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* Thống kê nhanh */}
      <div className="stat-grid stat-grid-3" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue"><Receipt size={18} /></div>
          <div>
            <p className="stat-label">Tổng số phòng</p>
            <p className="stat-value">{filteredData.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><CheckCircle2 size={18} /></div>
          <div>
            <p className="stat-label">Đã thanh toán</p>
            <p className="stat-value text-green">{fmtVND(totalPaid)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-red"><AlertCircle size={18} /></div>
          <div>
            <p className="stat-label">Chưa thanh toán</p>
            <p className="stat-value text-red">{fmtVND(totalUnpaid)}</p>
          </div>
        </div>
      </div>

      {/* Bảng danh sách */}
      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>STT</th>
                <th>Phòng</th>
                <th>Chủ hộ/Đại diện</th>
                <th style={{ textAlign: "right" }}>Tiền phòng</th>
                <th style={{ textAlign: "right" }}>Tiền điện</th>
                <th style={{ textAlign: "right" }}>Tiền nước</th>
                <th style={{ textAlign: "right" }}>Tiền rác</th>
                <th style={{ textAlign: "right" }}>Tổng tiền</th>
                <th style={{ textAlign: "center" }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px 0" }}>
                    <EmptyState 
                      icon={Receipt} 
                      title="Không có dữ liệu" 
                      hint="Không có phòng nào đang thuê hoặc chưa có hóa đơn cho tháng này" 
                    />
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.roomId}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{item.roomNumber}</strong>
                    </td>
                    <td>{item.representative}</td>
                    <td style={{ textAlign: "right" }}>{fmtVND(item.rentPrice)}</td>
                    <td style={{ textAlign: "right" }}>
                      {item.invoice ? fmtVND(item.invoice.electricity_amount) : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {item.invoice ? fmtVND(item.invoice.water_amount) : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {item.invoice ? fmtVND(item.invoice.trash_amount) : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong>{item.invoice ? fmtVND(item.totalAmount) : "—"}</strong>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {item.hasInvoice ? (
                        <Badge status={item.status} />
                      ) : (
                        <span className="badge badge-empty">Chưa có</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredData.length > 0 && (
              <tfoot>
                <tr style={{ fontWeight: 700, background: "var(--grey-bg)" }}>
                  <td colSpan={7} style={{ textAlign: "right" }}>TỔNG CỘNG</td>
                  <td style={{ textAlign: "right" }}>{fmtVND(totalAmount)}</td>
                  <td></td>
                </tr>
                <tr style={{ background: "var(--grey-bg)" }}>
                  <td colSpan={7} style={{ textAlign: "right", fontSize: 12, color: "var(--ink-400)" }}>
                    Đã thanh toán: {fmtVND(totalPaid)} | Chưa thanh toán: {fmtVND(totalUnpaid)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Hướng dẫn */}
      <div className="muted small" style={{ marginTop: 12, padding: "0 4px" }}>
        💡 <strong>Hướng dẫn:</strong> Chọn tháng/năm để xem danh sách thu. 
        Hóa đơn chưa có sẽ hiển thị "Chưa có". 
        Bấm nút "Xuất Excel" để tải file CSV.
      </div>
    </div>
  );
}

// ============================================================
// CẬP NHẬT IMPORT - Thêm ClipboardList vào import
// ============================================================
// Thay đổi dòng import từ:
// import {
//   Home, Building2, Users, Receipt, Wallet, Plus, X, Search,
//   Zap, Droplet, CheckCircle2, Circle, Trash2, Pencil, History,
//   Copy, Download, ChevronDown, TrendingUp, TrendingDown, AlertCircle,
// } from "lucide-react";

// Thành:
// import {
//   Home, Building2, Users, Receipt, Wallet, Plus, X, Search,
//   Zap, Droplet, CheckCircle2, Circle, Trash2, Pencil, History,
//   Copy, Download, ChevronDown, TrendingUp, TrendingDown, AlertCircle,
//   ClipboardList, // THÊM ICON NÀY
// } from "lucide-react";

// ============================================================
// CẬP NHẬT RENDER TRONG APP - Thêm tab mới
// ============================================================
// Thay đổi trong App component, phần render:

{/* Thay thế phần này: */}
{tab === "tongquan" && <TongQuan {...ctx} />}
{tab === "nha" && <NhaPhong {...ctx} />}
{tab === "khach" && <KhachThue {...ctx} />}
{tab === "hoadon" && <HoaDon {...ctx} />}
{tab === "thuchi" && <ThuChi {...ctx} />}

{/* Bằng: */}
{tab === "tongquan" && <TongQuan {...ctx} />}
{tab === "nha" && <NhaPhong {...ctx} />}
{tab === "khach" && <KhachThue {...ctx} />}
{tab === "hoadon" && <HoaDon {...ctx} />}
{tab === "danhsachthu" && <DanhSachThu {...ctx} />} {/* TAB MỚI */}
{tab === "thuchi" && <ThuChi {...ctx} />}