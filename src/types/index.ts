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

export type WorkLogSource = 'web' | 'mobile' | 'nfc' | 'manual';

export type AbsenceRequestStatus = 'pending' | 'approved' | 'rejected' | 'partial';

export type AbsenceRequestPeriodStatus = 'pending' | 'approved' | 'rejected';

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
  allow_vacation_excess?: boolean;
  max_vacation_excess_days?: number | null;
  geolocation_enabled: boolean;
  geolocation_required: boolean;
  geolocation_radius?: number;
  office_latitude?: number;
  office_longitude?: number;
  office_address?: string;
  logo_path?: string;
  vacation_request_advance_days?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Department {
  id: string;
  uuid: string;
  company_id: string;
  supervisor_id?: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Employee {
  id: string;
  uuid: string;
  companyId: string;
  departmentId?: string;
  userId: string;
  contractStartTime?: string;
  contractEndTime?: string;
  remainingVacationDays: number;
  active: boolean;
  company?: Company;
  department?: Department;
  user?: User;
  createdAt?: string;
  updatedAt?: string;
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
  nfc_device_id?: string | null;
  nfc_card_id?: string | null;
  source?: WorkLogSource;
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

export interface AbsenceRequestPeriod {
  id: string;
  start_date: string;
  end_date: string;
  is_partial: boolean;
  start_time?: string;
  end_time?: string;
  status: AbsenceRequestPeriodStatus;
  days_count: number;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  reviewer?: User;
}

export interface AbsenceRequest {
  id: string;
  uuid: string;
  employee_id: string;
  absence_type_id: string;
  start_date: string | null;
  end_date: string | null;
  is_partial: boolean;
  start_time?: string;
  end_time?: string;
  status: AbsenceRequestStatus;
  reviewed_by?: string;
  notes?: string;
  rejection_reason?: string;
  reviewed_at?: string;
  days_count: number;
  uses_periods?: boolean;
  approved_days_count?: number;
  pending_days_count?: number;
  periods?: AbsenceRequestPeriod[];
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

// ==========================================
// SCHEDULE TYPES (Horarios Flexibles)
// ==========================================

export type ScheduleType = 'normal' | 'split' | 'night' | 'guard' | 'rotating';

export interface ScheduleBlock {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  order: number;
}

export interface EmployeeSchedule {
  id: string;
  name: string;
  scheduleType: ScheduleType;
  isActive: boolean;
  effectiveFrom: string;
  effectiveUntil?: string;
  blocks: ScheduleBlock[];
}

export interface WeeklyScheduleDay {
  dayName: string;
  blocks: ScheduleBlock[];
  totalHours: number;
}

export interface WeeklyScheduleResponse {
  weekStart: string;
  weekEnd: string;
  schedule: {
    id: string;
    name: string;
    scheduleType: ScheduleType;
  };
  days: Record<string, WeeklyScheduleDay>;
  totalWeeklyHours: number;
}

// ==========================================
// OVERTIME TYPES (Horas Extra)
// ==========================================

export type OvertimeStatus = 'pending' | 'approved' | 'rejected';

export interface OvertimeRecord {
  id: string;
  date: string;
  hours: number;
  status: OvertimeStatus;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

export interface OvertimeMonthSummary {
  approved: number;
  pending: number;
  rejected: number;
}

export interface OvertimeSummary {
  employeeId: string;
  year: number;
  totalHours: number;
  approvedHours: number;
  pendingHours: number;
  rejectedHours: number;
  annualLimit: number;
  remainingLimit: number;
  byMonth: Record<string, OvertimeMonthSummary>;
  records: OvertimeRecord[];
}

export interface OvertimeRegistered {
  hours: number;
  status: OvertimeStatus;
  message: string;
}

// ==========================================
// INCIDENT TYPES (Incidencias)
// ==========================================

export type IncidentType = 'unclosed_shift' | 'late_arrival' | 'early_departure' | 'missing_checkout';
export type IncidentStatus = 'pending' | 'resolved' | 'validated' | 'marked_absence';

export interface Incident {
  id: string;
  date: string;
  type: IncidentType;
  status: IncidentStatus;
  expectedTime?: string;
  actualTime?: string;
  resolvedTime?: string;
  resolutionType?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  notes?: string;
}

export interface IncidentFilters {
  status?: IncidentStatus;
  type?: IncidentType;
  startDate?: string;
  endDate?: string;
}

// ==========================================
// ENHANCED COMPANY SETTINGS
// ==========================================

export interface EnhancedCompanySettings extends CompanySettings {
  weeklyHoursLimit?: number;
  annualOvertimeLimit?: number;
  overtimeApprovalMode?: 'pre_approval' | 'auto_register';
  maxVacationDays?: number;
}
