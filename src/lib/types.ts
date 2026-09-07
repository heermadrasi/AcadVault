export type UserRole = "admin" | "faculty";
export type AssignmentStatus = "pending" | "submitted" | "approved" | "rejected";
export type ReportStatus = "queued" | "running" | "done" | "failed";

export type Profile = {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
};

export type Faculty = {
  id: string;
  email: string;
  full_name: string;
  department: string | null;
  designation: string | null;
  employee_code: string | null;
  user_id: string | null;
  first_login_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  due_at: string;
  allow_multiple: boolean;
  accepted_mime: string[];
  max_size_mb: number;
  created_at: string;
};

export type TaskAssignment = {
  id: string;
  task_id: string;
  faculty_id: string;
  status: AssignmentStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  remarks: string | null;
};

export type DocumentRow = {
  id: string;
  faculty_id: string;
  assignment_id: string | null;
  category: string | null;
  title: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  version: number;
  is_current: boolean;
  uploaded_at: string;
};

export type ReportTemplate = {
  id: string;
  name: string;
  body_html: string;
  header_html: string | null;
  footer_html: string | null;
  page_size: string;
  margins: Record<string, string>;
  append_files: boolean;
  category_filter: string[] | null;
  is_default: boolean;
  created_at: string;
};

export type ReportRun = {
  id: string;
  faculty_id: string;
  template_id: string;
  status: ReportStatus;
  storage_path: string | null;
  error_text: string | null;
  created_at: string;
  completed_at: string | null;
};

export type MatrixRow = {
  faculty_id: string;
  full_name: string;
  department: string | null;
  task_id: string;
  task_title: string;
  due_at: string;
  assignment_id: string;
  status: AssignmentStatus;
  submitted_at: string | null;
  is_overdue: boolean;
  file_count: number;
};

export const DOC_BUCKET = "faculty-documents";
export const REPORT_BUCKET = "reports";
