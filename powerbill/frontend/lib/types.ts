export type Role = "customer" | "billing_officer" | "admin";
export type BillStatus = "paid" | "unpaid" | "overdue";
export type ComplaintStatus = "open" | "in_progress" | "resolved";

export interface ApiErrorShape {
  error: { code: string; message: string; fields?: Record<string, string> };
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Tariff {
  id: string;
  name: string;
  rate_per_kwh: string;
  fixed_charge: string;
  vat_percent: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Meter {
  id: string;
  meter_number: string;
  customer_id: string;
  tariff_id: string;
  opening_reading: string;
  is_active: boolean;
  assigned_at: string;
}

export interface Bill {
  id: string;
  meter_id: string;
  customer_id: string;
  billing_month: string;
  units: string;
  total_amount: string;
  status: BillStatus;
  due_date: string;
  created_at: string;
  paid_at: string | null;
  reading_id?: string;
  previous_reading?: string;
  current_reading?: string;
  rate_per_kwh?: string;
  fixed_charge?: string;
  vat_percent?: string;
  energy_charge?: string;
  subtotal?: string;
  vat_amount?: string;
}

export interface Payment {
  id: string;
  bill_id: string;
  amount: string;
  method: "simulated" | "cash" | "bank" | "ussd";
  reference: string;
  paid_at: string;
}

export interface Complaint {
  id: string;
  customer_id: string;
  bill_id: string | null;
  category: string;
  subject: string;
  message: string;
  status: ComplaintStatus;
  response: string | null;
  responded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  ip_address: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface PageResult<T> { items: T[]; page: number; pages: number; total: number; }
export interface CustomerDashboard {
  outstanding_balance: string;
  unpaid_count: number;
  usage_6_months: { month: string; units: string }[];
  recent_bills: Bill[];
}
export interface StaffStats {
  customers: number; meters: number; unpaid: number; overdue: number;
  outstanding: string; collected: string; open_complaints: number;
}
export interface PublicStats {
  active_customers: number; bills_generated: number; payments_processed: number; on_time_payment_rate: number;
}
