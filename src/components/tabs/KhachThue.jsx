// src/components/tabs/KhachThue.jsx
import { useState, useMemo } from "react";
import { 
  Plus, Users, Search, User, Phone, Calendar, 
  Pencil, CheckCircle, Trash2, AlertCircle, Clock, AlertTriangle,
  CreditCard, MapPin, ShieldCheck, UserPlus, Save, FileSpreadsheet
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import Badge from "../common/Badge";
import EmptyState from "../common/EmptyState";
import Modal from "../common/Modal";
import ContractFormModal from "../modals/ContractFormModal";
import { fmtDate, fmtVND } from "../../utils/helpers";

const EMPTY_TENANT_FORM = {
  full_name: "",
  dob: "",
  phone: "",
  citizen_id: "",
  permanent_address: "",
  is_representative: false,
  residence_registration_date: "",
  temp_residence_expiry: "",
};

export default function KhachThue({ rooms, contracts, tenants, loadAll, notify }) {
  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [deleteContract, setDeleteContract] = useState(null);
  const [endingContract, setEndingContract] = useState(null);
  
  // State xem chi tiết, thêm mới & chỉnh sửa người thuê
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenantFormModal, setTenantFormModal] = useState(null);
  const [tenantForm, setTenantForm] = useState(EMPTY_TENANT_FORM);
  const [savingTenant, setSavingTenant] = useState(false);
  const [formError, setFormError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [working, setWorking] = useState(false);

  const handleNotify = (msg, type = "ok") => {
    if (typeof notify === "function") notify(msg, type);
  };

  const getDaysRemaining = (dateStr) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const now = new Date();
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  };

  // Danh sách hợp đồng đã lọc và SẮP XẾP THEO TÊN PHÒNG
  const rows = useMemo(() => {
    return contracts
      .map((c) => {
        const room = rooms.find((r) => r.id === c.room_id);
        const people = tenants.filter((t) => t.contract_id === c.id);
        const daysLeft = getDaysRemaining(c.end_date);
        return { contract: c, room, people, daysLeft };
      })
      .filter((row) => {
        if (statusFilter === "active" && row.contract.status !== "active") return false;
        if (statusFilter === "ended" && row.contract.status === "active") return false;

        if (!search.trim()) return true;
        const s = search.toLowerCase().trim();
        return (
          row.room?.room_number?.toLowerCase().includes(s) ||
          row.people.some((p) => p.full_name?.toLowerCase().includes(s)) ||
          row.people.some((p) => p.phone?.includes(s)) ||
          row.people.some((p) => (p.citizen_id || p.cccd)?.includes(s))
        );
      })
      .sort((a, b) => {
        const roomA = a.room?.room_number || "";
        const roomB = b.room?.room_number || "";
        return roomA.localeCompare(roomB, "vi", { numeric: true, sensitivity: "base" });
      });
  }, [contracts, rooms, tenants, statusFilter, search]);

  const activeCount = contracts.filter((c) => c.status === "active").length;
  const expiringCount = contracts.filter((c) => {
    if (c.status !== "active" || !c.end_date) return false;
    const days = getDaysRemaining(c.end_date);
    return days !== null && days >= 0 && days <= 30;
  }).length;

  // ============================================================
  // XUẤT EXCEL DANH SÁCH TẤT CẢ NGƯỜI THUÊ
  // ============================================================
  const handleExportTenantsExcel = () => {
    if (!tenants || tenants.length === 0) {
      return handleNotify("Chưa có dữ liệu người thuê để xuất", "error");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exportRows = tenants
      .map((t) => {
        const contract = contracts.find((c) => c.id === t.contract_id);
        const room = contract ? rooms.find((r) => r.id === contract.room_id) : null;

        let tamTruStatus = "Đã đăng ký hợp lệ";
        if (!t.residence_registration_date) {
          tamTruStatus = "Chưa đăng ký tạm trú";
        } else if (t.temp_residence_expiry) {
          const exp = new Date(t.temp_residence_expiry);
          exp.setHours(0, 0, 0, 0);
          if (exp < today) {
            tamTruStatus = "Đã hết hạn tạm trú";
          } else {
            const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) {
              tamTruStatus = `Sắp hết hạn (còn ${diffDays} ngày)`;
            }
          }
        }

        const rawDob = t.dob || t.date_of_birth || t.birthday || "";

        return {
          roomNumber: room?.room_number || "—",
          contractStatus: contract?.status === "active" ? "Đang thuê" : "Đã thanh lý",
          fullName: t.full_name || "",
          dob: rawDob ? fmtDate(rawDob) : "",
          role: t.is_representative ? "Đại diện hợp đồng" : "Thành viên",
          phone: t.phone || "",
          citizenId: t.citizen_id || t.cccd || "",
          permanentAddress: t.permanent_address || t.hometown || "",
          regDate: t.residence_registration_date ? fmtDate(t.residence_registration_date) : "",
          expDate: t.temp_residence_expiry ? fmtDate(t.temp_residence_expiry) : "",
          tamTruStatus,
        };
      })
      .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, "vi", { numeric: true, sensitivity: "base" }));

    const headers = [
      "STT",
      "Phòng",
      "Trạng thái hợp đồng",
      "Họ và tên",
      "Ngày sinh",
      "Vai trò",
      "Số điện thoại",
      "Số CCCD",
      "Nơi thường trú",
      "Ngày đăng ký tạm trú",
      "Ngày hết hạn tạm trú",
      "Tình trạng tạm trú",
    ];

    const escapeCsv = (val) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const csvLines = [
      headers.map(escapeCsv).join(","),
      ...exportRows.map((r, idx) =>
        [
          idx + 1,
          r.roomNumber,
          r.contractStatus,
          r.fullName,
          r.dob,
          r.role,
          r.phone ? `\t${r.phone}` : "",
          r.citizenId ? `\t${r.citizenId}` : "",
          r.permanentAddress,
          r.regDate,
          r.expDate,
          r.tamTruStatus,
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ];

    const csvContent = "\uFEFF" + csvLines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().split("T")[0];
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Danh_sach_nguoi_thue_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    handleNotify(`Đã xuất file Excel danh sách ${exportRows.length} người thuê`);
  };

  // Mở form thêm người thuê mới
  const openAddTenantModal = (contract, room) => {
    setFormError("");
    setTenantForm({
      ...EMPTY_TENANT_FORM,
      is_representative: tenants.filter((t) => t.contract_id === contract.id).length === 0,
    });
    setTenantFormModal({
      mode: "add",
      contractId: contract.id,
      roomNumber: room?.room_number || "—",
      tenantId: null,
      rawTenant: null,
    });
  };

  // Mở form chỉnh sửa người thuê
  const openEditTenantModal = (tenant) => {
    setFormError("");
    setTenantForm({
      full_name: tenant.full_name || "",
      dob: tenant.dob || tenant.date_of_birth || tenant.birthday || "",
      phone: tenant.phone || "",
      citizen_id: tenant.citizen_id || tenant.cccd || "",
      permanent_address: tenant.permanent_address || tenant.hometown || "",
      is_representative: !!tenant.is_representative,
      residence_registration_date: tenant.residence_registration_date || "",
      temp_residence_expiry: tenant.temp_residence_expiry || "",
    });
    setTenantFormModal({
      mode: "edit",
      contractId: tenant.contract_id,
      roomNumber: tenant.roomNumber || "—",
      tenantId: tenant.id,
      rawTenant: tenant,
    });
    setSelectedTenant(null);
  };

  // Lưu người thuê lên Supabase (tự thích ứng tên cột hiện có trong DB)
  const handleSaveTenant = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!tenantForm.full_name.trim()) {
      setFormError("Vui lòng nhập họ tên người thuê");
      return;
    }

    setSavingTenant(true);
    try {
      const sample = tenantFormModal.rawTenant || tenants[0] || {};
      const dobKey = "date_of_birth" in sample ? "date_of_birth" : "dob";
      const cccdKey = "cccd" in sample && !("citizen_id" in sample) ? "cccd" : "citizen_id";
      const addrKey = "hometown" in sample && !("permanent_address" in sample) ? "hometown" : "permanent_address";

      const payload = {
        contract_id: tenantFormModal.contractId,
        full_name: tenantForm.full_name.trim(),
        phone: tenantForm.phone.trim() || null,
        [cccdKey]: tenantForm.citizen_id.trim() || null,
        [addrKey]: tenantForm.permanent_address.trim() || null,
        is_representative: tenantForm.is_representative,
        residence_registration_date: tenantForm.residence_registration_date || null,
        temp_residence_expiry: tenantForm.temp_residence_expiry || null,
      };

      if (tenantForm.dob || dobKey in sample) {
        payload[dobKey] = tenantForm.dob || null;
      }

      if (payload.is_representative) {
        await supabase
          .from("tenants")
          .update({ is_representative: false })
          .eq("contract_id", tenantFormModal.contractId);
      }

      if (tenantFormModal.mode === "add") {
        const { error } = await supabase.from("tenants").insert([payload]);
        if (error) throw error;
        handleNotify(`Đã thêm khách thuê ${payload.full_name} và đồng bộ dữ liệu`);
      } else {
        const { error } = await supabase
          .from("tenants")
          .update(payload)
          .eq("id", tenantFormModal.tenantId);
        if (error) throw error;
        handleNotify(`Đã cập nhật thông tin của ${payload.full_name}`);
      }

      setTenantFormModal(null);
      if (typeof loadAll === "function") loadAll();
    } catch (err) {
      const msg = err.message || "Lỗi khi lưu thông tin người thuê";
      setFormError(msg);
      handleNotify(msg, "error");
    } finally {
      setSavingTenant(false);
    }
  };

  // Xóa người thuê
  const handleDeleteTenant = async (tenant) => {
    if (!window.confirm(`Bạn có chắc muốn xóa khách thuê "${tenant.full_name}" khỏi phòng này?`)) return;
    setWorking(true);
    try {
      const { error } = await supabase.from("tenants").delete().eq("id", tenant.id);
      if (error) throw error;
      handleNotify(`Đã xóa khách thuê ${tenant.full_name}`);
      setSelectedTenant(null);
      if (typeof loadAll === "function") loadAll();
    } catch (err) {
      handleNotify(err.message || "Lỗi khi xóa người thuê", "error");
    } finally {
      setWorking(false);
    }
  };

  // Kết thúc hợp đồng / Trả phòng
  const handleEndContract = async () => {
    if (!endingContract) return;
    setWorking(true);
    try {
      const { error: contractErr } = await supabase
        .from("contracts")
        .update({ status: "ended", updated_at: new Date().toISOString() })
        .eq("id", endingContract.id);

      if (contractErr) throw contractErr;

      if (endingContract.room_id) {
        await supabase
          .from("rooms")
          .update({ status: "trong" })
          .eq("id", endingContract.room_id);
      }

      handleNotify("Đã kết thúc hợp đồng và cập nhật phòng về trạng thái trống");
      setEndingContract(null);
      if (typeof loadAll === "function") loadAll();
    } catch (e) {
      handleNotify(e.message || "Lỗi khi kết thúc hợp đồng", "error");
    } finally {
      setWorking(false);
    }
  };

  // Xóa hợp đồng
  const handleDeleteContract = async () => {
    if (!deleteContract) return;
    setWorking(true);
    try {
      const { error } = await supabase.from("contracts").delete().eq("id", deleteContract.id);
      if (error) throw error;

      handleNotify("Đã xóa hợp đồng thành công");
      setDeleteContract(null);
      if (typeof loadAll === "function") loadAll();
    } catch (e) {
      handleNotify(e.message || "Lỗi khi xóa hợp đồng", "error");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="page">
      <header className="page-head row-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>👥 Khách thuê & Hợp đồng</h1>
          <p>Quản lý hợp đồng cho thuê, thời hạn và cư dân lưu trú</p>
          <div className="stats-mini">
            <span>Tổng hợp đồng: <strong>{contracts.length}</strong></span>
            <span>Đang hoạt động: <strong className="text-green">{activeCount}</strong></span>
            {expiringCount > 0 && (
              <span style={{ color: "#d97706" }}>
                <Clock size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                Sắp hết hạn (≤ 30 ngày): <strong>{expiringCount}</strong>
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportTenantsExcel}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <FileSpreadsheet size={16} /> Xuất DS người thuê
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={() => { setEditingContract(null); setShowModal(true); }}
          >
            <Plus size={16} /> Lập hợp đồng mới
          </button>
        </div>
      </header>

      {/* Thanh lọc & tìm kiếm */}
      <div className="filter-bar" style={{ gap: 12 }}>
        <div className="filter-group">
          <button 
            className={`btn-ghost-sm ${statusFilter === "all" ? "btn-ghost-highlight" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            Tất cả ({contracts.length})
          </button>
          <button 
            className={`btn-ghost-sm ${statusFilter === "active" ? "btn-ghost-highlight" : ""}`}
            onClick={() => setStatusFilter("active")}
          >
            Đang thuê ({activeCount})
          </button>
          <button 
            className={`btn-ghost-sm ${statusFilter === "ended" ? "btn-ghost-highlight" : ""}`}
            onClick={() => setStatusFilter("ended")}
          >
            Đã kết thúc ({contracts.length - activeCount})
          </button>
        </div>

        <div className="search-bar" style={{ flex: 1 }}>
          <Search size={16} />
          <input 
            placeholder="Tìm theo số phòng, tên khách, số điện thoại, CCCD…" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
      </div>

      {/* Danh sách hợp đồng / phòng (Đã sắp xếp theo tên phòng) */}
      <div className="contract-list">
        {rows.map(({ contract, room, people, daysLeft }) => {
          const isActive = contract.status === "active";
          const isExpiring = isActive && daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

          return (
            <div key={contract.id} className="contract-card" style={{ opacity: isActive ? 1 : 0.78 }}>
              <div className="contract-card-head">
                <div>
                  <p className="contract-room">Phòng {room?.room_number || "—"}</p>
                  <p className="contract-date">
                    <Calendar size={14} /> {fmtDate(contract.start_date)}
                    {contract.end_date ? ` → ${fmtDate(contract.end_date)}` : " (Vô thời hạn)"}
                  </p>
                  {isExpiring && (
                    <span className="small text-orange" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                      <AlertCircle size={13} /> Sắp hết hạn hợp đồng trong {daysLeft} ngày
                    </span>
                  )}
                </div>
                <Badge status={isActive ? "da_thue" : "trong"} label={isActive ? "Đang thuê" : "Đã thanh lý"} />
              </div>

              <div className="contract-meta">
                <span>💰 Giá thuê: <strong>{fmtVND(contract.rent_price)}</strong></span>
                <span>💳 Cọc: <strong>{fmtVND(contract.deposit)}</strong></span>
              </div>

              {/* Danh sách nhãn (label) người thuê + ngày hết hạn tạm trú + nút Thêm người thuê */}
              <div className="tenant-chip-list" style={{ marginTop: 12, alignItems: "center", gap: 8 }}>
                {people.map((p) => {
                  const noTamTru = !p.residence_registration_date;
                  const expDays = getDaysRemaining(p.temp_residence_expiry);

                  let tamTruLabel = null;
                  let tamTruStyle = {
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 7px",
                    borderRadius: 6,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    lineHeight: 1.2,
                  };

                  if (noTamTru) {
                    tamTruLabel = "Chưa tạm trú";
                    tamTruStyle = {
                      ...tamTruStyle,
                      background: "#fee2e2",
                      color: "#b91c1c",
                    };
                  } else if (p.temp_residence_expiry) {
                    if (expDays !== null && expDays < 0) {
                      tamTruLabel = `Hết hạn TT: ${fmtDate(p.temp_residence_expiry)}`;
                      tamTruStyle = {
                        ...tamTruStyle,
                        background: "#fee2e2",
                        color: "#b91c1c",
                      };
                    } else if (expDays !== null && expDays <= 30) {
                      tamTruLabel = `Hết hạn TT: ${fmtDate(p.temp_residence_expiry)}`;
                      tamTruStyle = {
                        ...tamTruStyle,
                        background: "#fef3c7",
                        color: "#b45309",
                      };
                    } else {
                      tamTruLabel = `Hết hạn TT: ${fmtDate(p.temp_residence_expiry)}`;
                      tamTruStyle = {
                        ...tamTruStyle,
                        background: "#dcfce7",
                        color: "#15803d",
                      };
                    }
                  } else {
                    tamTruLabel = "Chưa có ngày hết hạn TT";
                    tamTruStyle = {
                      ...tamTruStyle,
                      background: "#fef3c7",
                      color: "#b45309",
                    };
                  }

                  return (
                    <span 
                      key={p.id} 
                      className={`tenant-chip ${p.is_representative ? "tenant-chip-rep" : ""}`}
                      onClick={() => setSelectedTenant({ ...p, roomNumber: room?.room_number })}
                      style={{ 
                        cursor: "pointer", 
                        userSelect: "none", 
                        display: "inline-flex", 
                        alignItems: "center", 
                        flexWrap: "wrap",
                        gap: 6,
                        padding: "5px 10px"
                      }}
                      title="Nhấn để xem và chỉnh sửa thông tin người thuê"
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <User size={12} /> 
                        <strong>{p.full_name}</strong>
                        {p.is_representative && <span>· đại diện</span>}
                      </span>

                      {p.phone && (
                        <span 
                          style={{ 
                            display: "inline-flex", 
                            alignItems: "center", 
                            gap: 4, 
                            fontSize: 12, 
                            color: "inherit",
                            opacity: 0.85
                          }}
                        >
                          <Phone size={11} />
                          <span>{p.phone}</span>
                        </span>
                      )}

                      {tamTruLabel && (
                        <span style={tamTruStyle}>
                          <ShieldCheck size={11} />
                          <span>{tamTruLabel}</span>
                        </span>
                      )}
                    </span>
                  );
                })}

                {isActive && (
                  <button
                    type="button"
                    onClick={() => openAddTenantModal(contract, room)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "6px 12px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "var(--primary, #2563eb)",
                      background: "#eff6ff",
                      border: "1px dashed #93c5fd",
                      borderRadius: 20,
                      cursor: "pointer",
                    }}
                  >
                    <UserPlus size={13} /> Thêm người thuê
                  </button>
                )}

                {people.length === 0 && !isActive && (
                  <span className="muted small">Chưa có thông tin cư dân</span>
                )}
              </div>

              {/* Nhóm nút tác vụ hợp đồng */}
              <div className="invoice-card-actions" style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                <button 
                  className="btn-ghost-sm" 
                  onClick={() => { setEditingContract(contract); setShowModal(true); }}
                >
                  <Pencil size={14} /> Sửa hợp đồng
                </button>

                {isActive && (
                  <button 
                    className="btn-ghost-sm text-green" 
                    onClick={() => setEndingContract(contract)}
                  >
                    <CheckCircle size={14} /> Trả phòng / Kết thúc
                  </button>
                )}

                <button 
                  className="btn-ghost-sm btn-ghost-danger" 
                  onClick={() => setDeleteContract(contract)}
                >
                  <Trash2 size={14} /> Xóa
                </button>
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <EmptyState 
            icon={Users} 
            title="Không tìm thấy hợp đồng" 
            hint="Không có hợp đồng nào phù hợp với bộ lọc tìm kiếm" 
          />
        )}
      </div>

      {/* ============================================================
          1. MODAL XEM CHI TIẾT NGƯỜI THUÊ (KÈM NÚT CHỈNH SỬA THÔNG TIN)
          ============================================================ */}
      {selectedTenant && (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const regDate = selectedTenant.residence_registration_date;
        const expDate = selectedTenant.temp_residence_expiry;
        const dobValue = selectedTenant.dob || selectedTenant.date_of_birth || selectedTenant.birthday;
        const expiry = expDate ? new Date(expDate) : null;
        if (expiry) expiry.setHours(0, 0, 0, 0);

        let statusBadge = {
          text: "Đã đăng ký hợp lệ",
          bg: "#dcfce7",
          color: "#15803d",
          border: "#bbf7d0",
          icon: "✅",
        };

        if (!regDate) {
          statusBadge = {
            text: "Chưa đăng ký tạm trú",
            bg: "#fee2e2",
            color: "#b91c1c",
            border: "#fecaca",
            icon: "⚠️",
          };
        } else if (expiry && expiry < today) {
          statusBadge = {
            text: "Đã hết hạn tạm trú",
            bg: "#fef3c7",
            color: "#b45309",
            border: "#fde68a",
            icon: "⏰",
          };
        }

        return (
          <Modal title="Thông tin người thuê" onClose={() => setSelectedTenant(null)} width={470}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
                <div style={{ 
                  width: 46, height: 46, borderRadius: "50%", 
                  background: "var(--blue-100, #e0f2fe)", color: "var(--blue-600, #0284c7)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18 
                }}>
                  {selectedTenant.full_name?.charAt(0)?.toUpperCase() || "K"}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, color: "#111827", fontWeight: 700 }}>
                    {selectedTenant.full_name}
                  </h3>
                  <span className="small muted">
                    {selectedTenant.is_representative ? "⭐ Người đại diện hợp đồng" : "Thành viên lưu trú"} · Phòng {selectedTenant.roomNumber || "—"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
                <div className="row-between">
                  <span style={{ color: "#4b5563", display: "flex", alignItems: "center", gap: 8 }}>
                    <Calendar size={15} /> Ngày tháng năm sinh:
                  </span>
                  <strong style={{ color: "#111827" }}>
                    {dobValue ? fmtDate(dobValue) : "Chưa cập nhật"}
                  </strong>
                </div>

                <div className="row-between">
                  <span style={{ color: "#4b5563", display: "flex", alignItems: "center", gap: 8 }}>
                    <Phone size={15} /> Số điện thoại:
                  </span>
                  {selectedTenant.phone ? (
                    <a 
                      href={`tel:${selectedTenant.phone}`} 
                      style={{ fontWeight: 600, color: "var(--primary, #2563eb)", textDecoration: "none" }}
                    >
                      {selectedTenant.phone} (Gọi)
                    </a>
                  ) : (
                    <span className="muted">Chưa cập nhật</span>
                  )}
                </div>

                <div className="row-between">
                  <span style={{ color: "#4b5563", display: "flex", alignItems: "center", gap: 8 }}>
                    <CreditCard size={15} /> Số CCCD:
                  </span>
                  <strong style={{ color: "#111827" }}>
                    {selectedTenant.citizen_id || selectedTenant.cccd || "Chưa cập nhật"}
                  </strong>
                </div>

                <div className="row-between" style={{ alignItems: "flex-start" }}>
                  <span style={{ color: "#4b5563", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                    <MapPin size={15} /> Nơi thường trú:
                  </span>
                  <span style={{ textAlign: "right", color: "#111827", fontWeight: 500, maxWidth: "60%" }}>
                    {selectedTenant.permanent_address || selectedTenant.hometown || "Chưa cập nhật"}
                  </span>
                </div>
              </div>

              <div style={{ 
                background: "#f9fafb", 
                border: "1px solid var(--line, #e5e7eb)", 
                borderRadius: 8, 
                padding: 14 
              }}>
                <div className="row-between" style={{ marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                    <ShieldCheck size={16} /> Tình trạng tạm trú
                  </span>
                  <span style={{ 
                    padding: "3px 8px", 
                    borderRadius: 6, 
                    fontSize: 12, 
                    fontWeight: 600,
                    background: statusBadge.bg,
                    color: statusBadge.color,
                    border: `1px solid ${statusBadge.border}`
                  }}>
                    {statusBadge.icon} {statusBadge.text}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                  <div className="row-between">
                    <span className="muted">Ngày đăng ký:</span>
                    <strong style={{ color: "#111827" }}>
                      {regDate ? fmtDate(regDate) : "—"}
                    </strong>
                  </div>

                  <div className="row-between">
                    <span className="muted">Ngày hết hạn tạm trú:</span>
                    <strong style={{ color: expiry && expiry < today ? "#b45309" : "#111827" }}>
                      {expDate ? fmtDate(expDate) : "—"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 4, justifyContent: "space-between" }}>
                <button 
                  type="button" 
                  className="btn-ghost-sm btn-ghost-danger" 
                  onClick={() => handleDeleteTenant(selectedTenant)}
                  disabled={working}
                >
                  <Trash2 size={15} /> Xóa khách
                </button>

                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn-secondary" onClick={() => setSelectedTenant(null)}>
                    Đóng
                  </button>
                  <button 
                    type="button" 
                    className="btn-primary" 
                    onClick={() => openEditTenantModal(selectedTenant)}
                  >
                    <Pencil size={15} /> Chỉnh sửa thông tin
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ============================================================
          2. MODAL FORM NHẬP / CHỈNH SỬA THÔNG TIN NGƯỜI THUÊ
          ============================================================ */}
      {tenantFormModal && (
        <Modal
          title={
            tenantFormModal.mode === "add"
              ? `Thêm người thuê — Phòng ${tenantFormModal.roomNumber}`
              : `Chỉnh sửa thông tin — Phòng ${tenantFormModal.roomNumber}`
          }
          onClose={() => setTenantFormModal(null)}
          width={480}
        >
          <form onSubmit={handleSaveTenant} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {formError && (
              <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "8px 12px", borderRadius: 6, fontSize: 13 }}>
                ⚠️ {formError}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: 13 }}>
                  Họ và tên *
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Nguyễn Văn A"
                  value={tenantForm.full_name}
                  onChange={(e) => setTenantForm({ ...tenantForm, full_name: e.target.value })}
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: 13 }}>
                  Ngày tháng năm sinh
                </label>
                <input
                  type="date"
                  className="input"
                  value={tenantForm.dob}
                  onChange={(e) => setTenantForm({ ...tenantForm, dob: e.target.value })}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: 13 }}>
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  className="input"
                  placeholder="0901234567"
                  value={tenantForm.phone}
                  onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
                  style={{ width: "100%" }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: 13 }}>
                  Số CCCD
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="079099001234"
                  value={tenantForm.citizen_id}
                  onChange={(e) => setTenantForm({ ...tenantForm, citizen_id: e.target.value })}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: 13 }}>
                Nơi thường trú
              </label>
              <input
                type="text"
                className="input"
                placeholder="Địa chỉ thường trú trên CCCD..."
                value={tenantForm.permanent_address}
                onChange={(e) => setTenantForm({ ...tenantForm, permanent_address: e.target.value })}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
              <p style={{ margin: "0 0 10px 0", fontSize: 13, fontWeight: 700, color: "#374151" }}>
                📋 Thông tin tạm trú (đồng bộ với thông báo nhắc hạn)
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: 12.5 }}>
                    Ngày đăng ký tạm trú
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={tenantForm.residence_registration_date}
                    onChange={(e) =>
                      setTenantForm({ ...tenantForm, residence_registration_date: e.target.value })
                    }
                    style={{ width: "100%" }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: 12.5 }}>
                    Ngày hết hạn tạm trú
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={tenantForm.temp_residence_expiry}
                    onChange={(e) =>
                      setTenantForm({ ...tenantForm, temp_residence_expiry: e.target.value })
                    }
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={tenantForm.is_representative}
                onChange={(e) => setTenantForm({ ...tenantForm, is_representative: e.target.checked })}
              />
              <span>Đặt làm <strong>Người đại diện hợp đồng</strong> (hiển thị trên bảng thu tiền)</span>
            </label>

            <div className="modal-actions" style={{ marginTop: 6 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setTenantFormModal(null)}
                disabled={savingTenant}
              >
                Hủy
              </button>
              <button type="submit" className="btn-primary" disabled={savingTenant}>
                <Save size={15} /> {savingTenant ? "Đang lưu..." : "Lưu thông tin"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Lập / Sửa hợp đồng */}
      {showModal && (
        <ContractFormModal 
          rooms={rooms} 
          contract={editingContract}
          onClose={() => { setShowModal(false); setEditingContract(null); }} 
          onSaved={() => { 
            setShowModal(false); 
            setEditingContract(null); 
            if (typeof loadAll === "function") loadAll(); 
            handleNotify(editingContract ? "Đã cập nhật hợp đồng" : "Đã lập hợp đồng mới"); 
          }} 
          notify={handleNotify} 
        />
      )}

      {/* Modal xác nhận thanh lý / trả phòng */}
      {endingContract && (
        <Modal title="Kết thúc hợp đồng / Trả phòng" onClose={() => setEndingContract(null)} width={420}>
          <p>
            Xác nhận kết thúc hợp đồng phòng <strong>{rooms.find(r => r.id === endingContract.room_id)?.room_number}</strong>?
          </p>
          <p className="muted small" style={{ marginTop: 8 }}>
            Hợp đồng sẽ chuyển sang trạng thái <strong>Đã thanh lý</strong> và trạng thái phòng sẽ tự động chuyển về <strong>Phòng trống</strong>.
          </p>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setEndingContract(null)} disabled={working}>Hủy</button>
            <button className="btn-primary" onClick={handleEndContract} disabled={working}>
              {working ? "Đang xử lý…" : "Xác nhận kết thúc"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal xác nhận xóa hợp đồng */}
      {deleteContract && (
        <Modal title="Xóa hợp đồng" onClose={() => setDeleteContract(null)} width={420}>
          <p>
            Bạn có chắc chắn muốn xóa vĩnh viễn hợp đồng phòng <strong>{rooms.find(r => r.id === deleteContract.room_id)?.room_number}</strong>?
          </p>
          <p className="muted small" style={{ marginTop: 8, color: "var(--red)" }}>
            Hành động này không thể hoàn tác. Các dữ liệu liên quan có thể bị ảnh hưởng.
          </p>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setDeleteContract(null)} disabled={working}>Hủy</button>
            <button className="btn-danger" onClick={handleDeleteContract} disabled={working}>
              {working ? "Đang xóa…" : "Xóa hợp đồng"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}