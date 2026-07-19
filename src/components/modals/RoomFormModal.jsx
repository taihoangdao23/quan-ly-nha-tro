// src/components/modals/RoomFormModal.jsx
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "../../supabaseClient";
import Modal from "../common/Modal";
import Field from "../common/Field";

// CSS inline cho component này
const styles = {
  tenantFormSection: {
    margin: '18px 0',
  },
  
  tenantCard: {
    border: '1px solid #e8eaed',
    borderRadius: '10px',
    padding: '16px',
    marginTop: '12px',
    background: '#fafbfc',
  },
  
  tenantFieldGroup: {
    display: 'flex',
    gap: '12px',
    marginBottom: '10px',
    flexWrap: 'wrap',
  },
  
  tenantField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    minWidth: '120px',
  },
  
  tenantLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#5f6368',
  },
  
  required: {
    color: '#ea4335',
    fontWeight: 700,
  },
  
  tenantInput: {
    border: '1px solid #e8eaed',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '13px',
    background: '#ffffff',
    transition: 'all 0.3s ease',
    width: '100%',
    outline: 'none',
  },
  
  tenantInputReadonly: {
    background: '#f1f3f4',
    cursor: 'not-allowed',
    color: '#5f6368',
  },
  
  tenantHint: {
    fontSize: '11px',
    color: '#80868b',
    fontStyle: 'italic',
    marginTop: '2px',
    display: 'block',
  },
  
  tenantRemoveBtn: {
    alignSelf: 'flex-end',
    marginBottom: '2px',
    padding: '6px 8px',
    color: '#ea4335',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  
  checkboxInline: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#5f6368',
    cursor: 'pointer',
    paddingTop: '4px',
  },
  
  checkboxInput: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: '#1a73e8',
  },
  
  mutedSmall: {
    color: '#80868b',
    fontSize: '12px',
    marginTop: '8px',
  },
};

export default function RoomFormModal({ room, contracts, tenants, onClose, onSaved, notify }) {
  // State cho thông tin phòng
  const [roomNumber, setRoomNumber] = useState(room?.room_number || "");
  const [rentPrice, setRentPrice] = useState(room?.rent_price || "");
  const [elecPrice, setElecPrice] = useState(room?.electricity_price || "");
  const [waterPrice, setWaterPrice] = useState(room?.water_price || "");
  const [trashPrice, setTrashPrice] = useState(room?.trash_price || "");
  const [saving, setSaving] = useState(false);

  // Tìm hợp đồng đang hoạt động của phòng
  const activeContract = room
    ? contracts?.find((c) => c.room_id === room.id && c.status === "active")
    : null;
  
  // Lấy danh sách người thuê hiện tại
  const existingTenants = activeContract
    ? tenants?.filter((t) => t.contract_id === activeContract.id) || []
    : [];

  // Hàm tính ngày hết hạn tạm trú (cộng 24 tháng)
  const calculateExpiryDate = (registrationDate) => {
    if (!registrationDate) return "";
    const date = new Date(registrationDate);
    date.setFullYear(date.getFullYear() + 2);
    return date.toISOString().split('T')[0];
  };

  // State cho danh sách người ở trong phòng
  const [people, setPeople] = useState(
    existingTenants.length > 0
      ? existingTenants.map((t) => ({
          id: t.id,
          full_name: t.full_name || "",
          phone: t.phone || "",
          id_card: t.id_card || "",
          date_of_birth: t.date_of_birth || "",
          permanent_address: t.permanent_address || "",
          residence_registration_date: t.residence_registration_date || "",
          temp_residence_expiry: t.temp_residence_expiry || calculateExpiryDate(t.residence_registration_date),
          is_representative: t.is_representative || false,
        }))
      : [{ 
          full_name: "", 
          phone: "", 
          id_card: "", 
          date_of_birth: "",
          permanent_address: "",
          residence_registration_date: "", 
          temp_residence_expiry: "",
          is_representative: true 
        }]
  );

  // Cập nhật ngày hết hạn khi ngày đăng ký tạm trú thay đổi
  const updateResidenceDate = (idx, value) => {
    const expiryDate = calculateExpiryDate(value);
    setPeople((p) =>
      p.map((per, i) =>
        i === idx 
          ? { 
              ...per, 
              residence_registration_date: value,
              temp_residence_expiry: expiryDate 
            }
          : per
      )
    );
  };

  // Thêm người mới
  const addPerson = () =>
    setPeople((p) => [
      ...p,
      { 
        full_name: "", 
        phone: "", 
        id_card: "", 
        date_of_birth: "",
        permanent_address: "",
        residence_registration_date: "", 
        temp_residence_expiry: "",
        is_representative: false 
      },
    ]);

  // Xóa người
  const removePerson = (idx) => 
    setPeople((p) => p.filter((_, i) => i !== idx));

  // Cập nhật thông tin người
  const updatePerson = (idx, field, value) =>
    setPeople((p) =>
      p.map((per, i) => {
        if (field === "is_representative" && value) {
          return { ...per, is_representative: i === idx };
        }
        return i === idx ? { ...per, [field]: value } : per;
      })
    );

  // Hàm gọi notify an toàn
  const safeNotify = (message, type = "ok") => {
    if (typeof notify === 'function') {
      notify(message, type);
    } else {
      console.log("Notification:", message, type);
    }
  };

  // Submit form
  const submit = async () => {
    console.log("=== START SUBMIT ===");
    
    // Validate: phải có tên phòng
    if (!roomNumber.trim()) {
      safeNotify("Vui lòng nhập tên/số phòng", "error");
      return;
    }

    // Lọc những người có tên không trống
    const validPeople = people.filter((p) => p.full_name.trim());
    console.log("Valid people:", validPeople);

    setSaving(true);

    try {
      // Tạo payload cho phòng
      const roomPayload = {
        room_number: roomNumber,
        rent_price: Number(rentPrice) || 0,
        electricity_price: Number(elecPrice) || 0,
        water_price: Number(waterPrice) || 0,
        trash_price: Number(trashPrice) || 0,
      };
      
      if (validPeople.length > 0) {
        roomPayload.status = "da_thue";
      } else {
        roomPayload.status = "trong";
      }

      let roomId = room?.id;

      // Cập nhật hoặc tạo mới phòng
      if (room) {
        const { error } = await supabase
          .from("rooms")
          .update(roomPayload)
          .eq("id", room.id);
        
        if (error) {
          console.error("Room update error:", error);
          setSaving(false);
          safeNotify("Lỗi cập nhật phòng: " + error.message, "error");
          return;
        }
        console.log("Room updated successfully!");
      } else {
        const { data, error } = await supabase
          .from("rooms")
          .insert(roomPayload)
          .select()
          .single();
        
        if (error) {
          console.error("Room create error:", error);
          setSaving(false);
          safeNotify("Lỗi tạo phòng: " + error.message, "error");
          return;
        }
        roomId = data.id;
        console.log("Room created successfully! ID:", roomId);
      }

      // Xử lý người thuê nếu có
      if (validPeople.length > 0) {
        let contractId = activeContract?.id;

        // Nếu chưa có hợp đồng, tạo mới
        if (!contractId) {
          const { data: contract, error: cErr } = await supabase
            .from("contracts")
            .insert({
              room_id: roomId,
              start_date: new Date().toISOString().slice(0, 10),
              rent_price: Number(rentPrice) || 0,
              status: "active",
            })
            .select()
            .single();
          
          if (cErr) {
            console.error("Contract create error:", cErr);
            setSaving(false);
            safeNotify("Lỗi tạo hợp đồng: " + cErr.message, "error");
            return;
          }
          contractId = contract.id;
          console.log("Contract created! ID:", contractId);
        }

        // Xóa tất cả người thuê cũ
        const { error: delErr } = await supabase
          .from("tenants")
          .delete()
          .eq("contract_id", contractId);
        
        if (delErr) {
          console.error("Delete tenants error:", delErr);
          setSaving(false);
          safeNotify("Lỗi xóa người thuê cũ: " + delErr.message, "error");
          return;
        }
        console.log("Old tenants deleted!");

        // Thêm người thuê mới - CHỈ THÊM CÁC CỘT CÓ TRONG DATABASE
        const tenantRows = validPeople.map((p) => {
          const row = {
            contract_id: contractId,
            full_name: p.full_name,
            phone: p.phone || null,
            id_card: p.id_card || null,
            is_representative: p.is_representative,
          };
          
          // Chỉ thêm các cột đã tồn tại trong database
          if (p.date_of_birth) row.date_of_birth = p.date_of_birth;
          if (p.permanent_address) row.permanent_address = p.permanent_address;
          if (p.residence_registration_date) row.residence_registration_date = p.residence_registration_date;
          if (p.temp_residence_expiry) row.temp_residence_expiry = p.temp_residence_expiry;
          
          return row;
        });
        
        console.log("Inserting tenants with columns:", tenantRows);
        const { error: tErr } = await supabase
          .from("tenants")
          .insert(tenantRows);
        
        if (tErr) {
          console.error("Insert tenants error:", tErr);
          setSaving(false);
          safeNotify("Lỗi thêm người thuê: " + tErr.message, "error");
          return;
        }
        console.log("New tenants inserted successfully!");
      } else {
        // Nếu không có người ở, xóa hợp đồng cũ (nếu có)
        if (activeContract?.id) {
          await supabase
            .from("contracts")
            .delete()
            .eq("id", activeContract.id);
          console.log("Old contract deleted!");
        }
      }

      setSaving(false);
      console.log("=== SUBMIT COMPLETED SUCCESSFULLY ===");
      safeNotify(room ? "Đã cập nhật phòng thành công!" : "Đã thêm phòng mới thành công!");
      
      if (typeof onSaved === 'function') {
        onSaved();
      }
      
    } catch (error) {
      console.error("Unexpected error:", error);
      setSaving(false);
      safeNotify("Lỗi không xác định: " + error.message, "error");
    }
  };

  return (
    <Modal 
      title={room ? "Sửa thông tin phòng" : "Thêm phòng mới"} 
      onClose={onClose} 
      width={760}
    >
      {/* Thông tin phòng */}
      <Field label="Tên phòng">
        <input 
          value={roomNumber} 
          onChange={(e) => setRoomNumber(e.target.value)} 
          placeholder="P101" 
        />
      </Field>

      <Field label="Giá thuê / tháng (đ)">
        <input 
          type="number" 
          value={rentPrice} 
          onChange={(e) => setRentPrice(e.target.value)} 
          placeholder="2500000" 
        />
      </Field>

      <div className="field-grid-2">
        <Field label="Đơn giá điện (đ/kWh)">
          <input 
            type="number" 
            value={elecPrice} 
            onChange={(e) => setElecPrice(e.target.value)} 
            placeholder="3500" 
          />
        </Field>
        <Field label="Đơn giá nước (đ/m³)">
          <input 
            type="number" 
            value={waterPrice} 
            onChange={(e) => setWaterPrice(e.target.value)} 
            placeholder="20000" 
          />
        </Field>
      </div>

      <Field label="Tiền rác / tháng (đ)">
        <input 
          type="number" 
          value={trashPrice} 
          onChange={(e) => setTrashPrice(e.target.value)} 
          placeholder="30000" 
        />
      </Field>

      {/* Danh sách người ở */}
      <div style={styles.tenantFormSection}>
        <div className="row-between">
          <span className="field-label">Khách thuê trong phòng</span>
          <button className="btn-ghost-sm" onClick={addPerson} type="button">
            <Plus size={14} /> Thêm người
          </button>
        </div>

        {people.map((p, idx) => (
          <div key={idx} style={styles.tenantCard}>
            {/* Hàng 1: Họ tên + SĐT */}
            <div style={styles.tenantFieldGroup}>
              <div style={styles.tenantField}>
                <label style={styles.tenantLabel}>
                  Họ tên <span style={styles.required}>*</span>
                </label>
                <input
                  style={styles.tenantInput}
                  value={p.full_name}
                  onChange={(e) => updatePerson(idx, "full_name", e.target.value)}
                  placeholder="Nhập họ tên"
                />
              </div>
              <div style={{ ...styles.tenantField, flex: 0.7 }}>
                <label style={styles.tenantLabel}>Số điện thoại</label>
                <input
                  style={styles.tenantInput}
                  value={p.phone}
                  onChange={(e) => updatePerson(idx, "phone", e.target.value)}
                  placeholder="Nhập số điện thoại"
                />
              </div>
              {people.length > 1 && (
                <button 
                  style={styles.tenantRemoveBtn}
                  onClick={() => removePerson(idx)} 
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Hàng 2: CCCD + Ngày sinh */}
            <div style={styles.tenantFieldGroup}>
              <div style={styles.tenantField}>
                <label style={styles.tenantLabel}>CCCD</label>
                <input
                  style={styles.tenantInput}
                  value={p.id_card}
                  onChange={(e) => updatePerson(idx, "id_card", e.target.value)}
                  placeholder="Nhập CCCD"
                />
              </div>
              <div style={styles.tenantField}>
                <label style={styles.tenantLabel}>Ngày sinh</label>
                <input
                  type="date"
                  style={styles.tenantInput}
                  value={p.date_of_birth}
                  onChange={(e) => updatePerson(idx, "date_of_birth", e.target.value)}
                />
              </div>
            </div>

            {/* Hàng 3: Nơi thường trú */}
            <div style={styles.tenantFieldGroup}>
              <div style={{ ...styles.tenantField, flex: 1 }}>
                <label style={styles.tenantLabel}>Nơi thường trú</label>
                <input
                  style={styles.tenantInput}
                  value={p.permanent_address}
                  onChange={(e) => updatePerson(idx, "permanent_address", e.target.value)}
                  placeholder="Nhập nơi thường trú"
                />
              </div>
            </div>

            {/* Hàng 4: Ngày đăng ký tạm trú + Ngày hết hạn tạm trú */}
            <div style={styles.tenantFieldGroup}>
              <div style={styles.tenantField}>
                <label style={styles.tenantLabel}>Ngày đăng ký tạm trú</label>
                <input
                  type="date"
                  style={styles.tenantInput}
                  value={p.residence_registration_date}
                  onChange={(e) => updateResidenceDate(idx, e.target.value)}
                />
              </div>
              <div style={styles.tenantField}>
                <label style={styles.tenantLabel}>Ngày hết hạn tạm trú</label>
                <input
                  type="date"
                  style={{ ...styles.tenantInput, ...styles.tenantInputReadonly }}
                  value={p.temp_residence_expiry}
                  readOnly
                />
                <span style={styles.tenantHint}>⏰ Tự động +24 tháng</span>
              </div>
            </div>

            {/* Checkbox chủ phòng */}
            <label style={styles.checkboxInline}>
              <input
                type="radio"
                name={`room-form-representative-${idx}`}
                style={styles.checkboxInput}
                checked={p.is_representative}
                onChange={(e) => updatePerson(idx, "is_representative", e.target.checked)}
              />
              Chủ phòng
            </label>
          </div>
        ))}

        <p style={styles.mutedSmall}>
          <span style={styles.required}>*</span> Bắt buộc nhập Họ tên. Để trống tất cả nếu phòng chưa có khách thuê.
        </p>
      </div>

      {/* Nút hành động */}
      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>
          Hủy
        </button>
        <button className="btn-primary" onClick={submit} disabled={saving}>
          {saving ? "Đang lưu…" : room ? "Lưu thay đổi" : "Lưu phòng"}
        </button>
      </div>
    </Modal>
  );
}