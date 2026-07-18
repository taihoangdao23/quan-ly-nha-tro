// src/hooks/useData.js
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

export function useData(notify) {
  const [houses, setHouses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [utilityReadings, setUtilityReadings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [h, r, c, t, i, e, u] = await Promise.all([
        supabase.from("houses").select("*").order("created_at"),
        supabase.from("rooms").select("*").order("room_number"),
        supabase.from("contracts").select("*").order("created_at", { ascending: false }),
        supabase.from("tenants").select("*"),
        supabase.from("invoices").select("*").order("year", { ascending: false }).order("month", { ascending: false }),
        supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
        supabase.from("utility_readings").select("*"),
      ]);
      
      const errors = [h, r, c, t, i, e, u].filter(res => res.error);
      if (errors.length > 0) {
        console.error("Supabase errors:", errors);
        notify("Lỗi tải dữ liệu: " + errors[0].error.message, "error");
      }
      
      setHouses(h.data || []);
      setRooms(r.data || []);
      setContracts(c.data || []);
      setTenants(t.data || []);
      setInvoices(i.data || []);
      setExpenses(e.data || []);
      setUtilityReadings(u.data || []);
    } catch (error) {
      console.error("Load error:", error);
      notify("Lỗi kết nối database", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    houses,
    rooms,
    contracts,
    tenants,
    invoices,
    expenses,
    utilityReadings,
    loading,
    loadAll,
  };
}