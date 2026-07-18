// src/components/common/Badge.jsx
import { STATUS_LABEL } from "../../constants";

export default function Badge({ status }) {
  // Kiểm tra STATUS_LABEL có tồn tại không
  if (!STATUS_LABEL) {
    return <span className="badge">{status || "Không xác định"}</span>;
  }
  
  const info = STATUS_LABEL[status] || { 
    text: status || "Không xác định", 
    className: "" 
  };
  
  return <span className={`badge ${info.className}`}>{info.text}</span>;
}