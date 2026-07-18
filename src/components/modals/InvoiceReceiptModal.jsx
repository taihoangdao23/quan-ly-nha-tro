// src/components/modals/InvoiceReceiptModal.jsx
import { useRef, useState } from "react";
import { Copy, Download, Zap, Droplet } from "lucide-react";
import html2canvas from "html2canvas";
import Modal from "../common/Modal";
import { fmtVND } from "../../utils/helpers";

export default function InvoiceReceiptModal({ invoice, onClose }) {
  const receiptRef = useRef(null);
  const [working, setWorking] = useState(false);

  const fileName = `hoa-don-${invoice.room_number}-${invoice.month}-${invoice.year}.png`;
  const isB3 = invoice.isB3;
  const isCompositeRoom = invoice.isCompositeRoom;

  const renderCanvas = async () => {
    return html2canvas(receiptRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
    });
  };

  const handleDownload = async () => {
    setWorking(true);
    try {
      const canvas = await renderCanvas();
      const link = document.createElement("a");
      link.download = fileName;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error(e);
    }
    setWorking(false);
  };

  const handleCopy = async () => {
    setWorking(true);
    try {
      const canvas = await renderCanvas();
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        } catch (e) {
          console.error(e);
        }
        setWorking(false);
      });
    } catch (e) {
      console.error(e);
      setWorking(false);
    }
  };

  return (
    <Modal title="Hóa đơn đã tạo" onClose={onClose} width={460}>
      <div className="receipt-wrap" ref={receiptRef}>
        <div className="receipt-head">
          <p className="receipt-room">Phòng {invoice.room_number}</p>
          <p className="receipt-month">Hóa đơn tháng {invoice.month}/{invoice.year}</p>
        </div>

        <div className="receipt-body">
          <div className="row-between">
            <span className="muted">Tiền phòng</span>
            <span>{fmtVND(invoice.rent_amount)}</span>
          </div>
          
          {isCompositeRoom ? (
            <>
              <div style={{ paddingLeft: '12px', borderLeft: '3px solid var(--blue-100)', margin: '4px 0' }}>
                <div className="row-between">
                  <span className="muted">P2 - Điện ({invoice.p2_elec_old} → {invoice.p2_elec_new}, {invoice.p2_elec_used} kWh)</span>
                  <span>{fmtVND(invoice.p2_elec_used * invoice.electricity_price)}</span>
                </div>
                <div className="row-between">
                  <span className="muted">P2 - Nước ({invoice.p2_water_old} → {invoice.p2_water_new}, {invoice.p2_water_used} m³)</span>
                  <span>{fmtVND(invoice.p2_water_used * invoice.water_price)}</span>
                </div>
                <div className="row-between">
                  <span className="muted">P3 - Điện ({invoice.p3_elec_old} → {invoice.p3_elec_new}, {invoice.p3_elec_used} kWh)</span>
                  <span>{fmtVND(invoice.p3_elec_used * invoice.electricity_price)}</span>
                </div>
                <div className="row-between">
                  <span className="muted">P3 - Nước ({invoice.p3_water_old} → {invoice.p3_water_new}, {invoice.p3_water_used} m³)</span>
                  <span>{fmtVND(invoice.p3_water_used * invoice.water_price)}</span>
                </div>
              </div>
              <div className="row-between" style={{ borderTop: '1px dashed var(--line)', paddingTop: '6px' }}>
                <span className="muted">Tổng điện + nước</span>
                <span>{fmtVND(invoice.total_elec_amount + invoice.total_water_amount)}</span>
              </div>
            </>
          ) : (
            <>
              {!isB3 && (
                <div className="row-between">
                  <span className="muted"><Zap size={13} className="inline-icon" /> Điện ({invoice.elec_old} → {invoice.elec_new}, {invoice.elec_used} kWh)</span>
                  <span>{fmtVND(invoice.electricity_amount)}</span>
                </div>
              )}
              <div className="row-between">
                <span className="muted">
                  <Droplet size={13} className="inline-icon" /> Nước 
                  {isB3 ? ` (${invoice.water_old} → ${invoice.water_new}, trừ ${invoice.water_subtract || 0}, dùng ${invoice.water_used} m³)` : ` (${invoice.water_old} → ${invoice.water_new}, ${invoice.water_used} m³)`}
                </span>
                <span>{fmtVND(invoice.water_amount)}</span>
              </div>
            </>
          )}
          
          <div className="row-between">
            <span className="muted">Tiền rác</span>
            <span>{fmtVND(invoice.trash_amount)}</span>
          </div>
          {Number(invoice.other_amount) > 0 && (
            <div className="row-between">
              <span className="muted">{invoice.other_note || "Phụ thu khác"}</span>
              <span>{fmtVND(invoice.other_amount)}</span>
            </div>
          )}
          <div className="invoice-total row-between">
            <strong>Tổng thanh toán</strong>
            <strong>{fmtVND(invoice.total_amount)}</strong>
          </div>
        </div>
      </div>

      <div className="modal-actions receipt-actions">
        <button className="btn-secondary" onClick={handleCopy} disabled={working}>
          <Copy size={15} /> Sao chép ảnh
        </button>
        <button className="btn-secondary" onClick={handleDownload} disabled={working}>
          <Download size={15} /> Tải ảnh xuống
        </button>
      </div>
      <button className="btn-primary full-width" onClick={onClose}>
        Xong
      </button>
    </Modal>
  );
}