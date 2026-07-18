// src/utils/helpers.js

export const fmtVND = (n) =>
  (Number(n) || 0).toLocaleString("vi-VN", { maximumFractionDigits: 0 }) + " đ";

export const roundToThousand = (n) => Math.round(Number(n) / 1000) * 1000;

export const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("vi-VN");
};

export const generateId = () => Date.now() + Math.random();