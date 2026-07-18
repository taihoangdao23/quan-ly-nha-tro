// src/constants/index.js

// ============================================================
// HẰNG SỐ THÁNG NĂM
// ============================================================
export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
export const THIS_YEAR = new Date().getFullYear();
export const YEARS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];

// ============================================================
// TRẠNG THÁI VÀ NHÃN HIỂN THỊ
// ============================================================
export const STATUS_LABEL = {
  trong: { 
    text: "Phòng trống", 
    className: "badge-empty" 
  },
  da_thue: { 
    text: "Đã thuê", 
    className: "badge-rented" 
  },
  chua_thanh_toan: { 
    text: "Chưa thanh toán", 
    className: "badge-unpaid" 
  },
  da_thanh_toan: { 
    text: "Đã thanh toán", 
    className: "badge-paid" 
  },
};

// ============================================================
// DANH SÁCH MENU ĐIỀU HƯỚNG
// ============================================================
export const NAV_ITEMS = [
  { 
    key: "tongquan", 
    label: "Tổng quan", 
    shortLabel: "Tổng quan", 
    icon: "Home" 
  },
  { 
    key: "nha", 
    label: "Nhà & phòng", 
    shortLabel: "Nhà/phòng", 
    icon: "Building2" 
  },
  { 
    key: "khach", 
    label: "Khách thuê", 
    shortLabel: "Khách", 
    icon: "Users" 
  },
  { 
    key: "hoadon", 
    label: "Hóa đơn", 
    shortLabel: "Hóa đơn", 
    icon: "Receipt" 
  },
  { 
    key: "danhsachthu", 
    label: "Danh sách thu", 
    shortLabel: "DS thu", 
    icon: "ClipboardList" 
  },
  { 
    key: "thuchi", 
    label: "Thu chi", 
    shortLabel: "Thu chi", 
    icon: "Wallet" 
  },
];

// ============================================================
// CÁC HẰNG SỐ KHÁC (NẾU CẦN)
// ============================================================
export const DEFAULT_ROOM_STATUS = "trong";
export const DEFAULT_CONTRACT_STATUS = "active";

// Loại hóa đơn
export const INVOICE_TYPES = {
  monthly: "monthly",
  one_time: "one_time",
};

// Phương thức thanh toán
export const PAYMENT_METHODS = {
  cash: "tien_mat",
  bank: "chuyen_khoan",
  momo: "momo",
  zalopay: "zalopay",
};

export const PAYMENT_METHOD_LABELS = {
  tien_mat: "Tiền mặt",
  chuyen_khoan: "Chuyển khoản",
  momo: "MoMo",
  zalopay: "ZaloPay",
};

// Loại chi phí
export const EXPENSE_CATEGORIES = [
  { value: "sua_chua", label: "Sửa chữa" },
  { value: "mua_sam", label: "Mua sắm" },
  { value: "luong", label: "Lương nhân công" },
  { value: "dien_nuoc", label: "Điện nước" },
  { value: "khac", label: "Khác" },
];

// Format ngày tháng
export const DATE_FORMAT = "DD/MM/YYYY";
export const DATE_FORMAT_DB = "YYYY-MM-DD";