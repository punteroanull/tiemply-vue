// Tipos de WorkLog
export type WorkLogType = 'check_in' | 'check_out';

export type WorkLogCategory =
  | 'shift_start'
  | 'shift_end'
  | 'break_start'
  | 'break_end'
  | 'offsite_start'
  | 'offsite_end';

export type WorkState = 'not_working' | 'working' | 'on_break' | 'offsite';

export type AbsenceRequestStatus = 'pending' | 'approved' | 'rejected';

export type VacationType = 'business_days' | 'calendar_days';

// Interfaces
export interface Role {
  id: string;
  uuid: string;
  name: string;
  description?: string;
  is_exempt: boolean;
  access_level: number;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  uuid: string;
  name: string;
  email: string;
  identification_number?: string;
  birth_date?: string;
  phone?: string;
  address?: string;
  locale?: string;
  role_id?: string;
  role?: Role;
  registered_at?: string;
  email_verified_at?: string;
  employeeRecords?: Employee[];
  companies?: Company[];
  created_at?: string;
  updated_at?: string;
}

export interface Company {
  id: string;
  uuid: string;
  name: string;
  tax_id: string;
  contact_email: string;
  contact_person: string;
  address: string;
  phone: string;
  vacation_type: VacationType;
  max_vacation_days: number;
  geolocation_enabled: boolean;
  geolocation_required: boolean;
  geolocation_radius?: number;
  office_latitude?: number;
  office_longitude?: number;
  office_address?: string;
  logo_path?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Employee {
  id: string;
  uuid: string;
  company_id: string;
  user_id: string;
  contract_start_time?: string;
  contract_end_time?: string;
  remaining_vacation_days: number;
  active: boolean;
  company?: Company;
  user?: User;
  created_at?: string;
  updated_at?: string;
}

export interface WorkLog {
  id: string;
  uuid: string;
  employee_id: string;
  date: string;
  time: string;
  type: WorkLogType;
  category: WorkLogCategory;
  paired_log_id?: string;
  ip_address?: string;
  location?: string | LocationData;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
  address?: string;
}

export interface AbsenceType {
  id: string;
  uuid: string;
  name: string;
  code: string;
  description?: string;
  requires_approval: boolean;
  affects_vacation_balance: boolean;
  is_paid: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Absence {
  id: string;
  uuid: string;
  employee_id: string;
  absence_type_id: string;
  request_id?: string;
  date: string;
  is_partial: boolean;
  start_time?: string;
  end_time?: string;
  notes?: string;
  absenceType?: AbsenceType;
  request?: AbsenceRequest;
  employee?: Employee;
  created_at?: string;
  updated_at?: string;
}

export interface AbsenceRequest {
  id: string;
  uuid: string;
  employee_id: string;
  absence_type_id: string;
  start_date: string;
  end_date: string;
  is_partial: boolean;
  start_time?: string;
  end_time?: string;
  status: AbsenceRequestStatus;
  reviewed_by?: string;
  notes?: string;
  rejection_reason?: string;
  reviewed_at?: string;
  days_count: number;
  absenceType?: AbsenceType;
  reviewer?: User;
  employee?: Employee;
  created_at?: string;
  updated_at?: string;
}

export interface CompanySettings {
  geolocation_enabled?: boolean;
  geolocation_required?: boolean;
  geolocation_radius?: number;
  office_latitude?: number;
  office_longitude?: number;
  office_address?: string;
}

export interface WorkStatus {
  checked_in: boolean;
  current_category?: WorkLogCategory;
  current_state?: WorkState;
  last_check_in?: string;
  last_check_out?: string;
  current_duration?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

// Work Log Report types
export interface WorkLogPair {
  date: string;
  check_in?: WorkLog;
  check_out?: WorkLog;
  duration?: string;
  logs: WorkLog[];
  status?: string;
  is_weekend?: boolean;
}

export interface WorkLogReport {
  days: WorkLogPair[];
  total_duration: string;
  total_days: number;
}
