export type Role = "commander" | "leader";

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  role: Role;
};

export type Zone = {
  id: string;
  name: string;
  group_name: string;
  scope_label: string;
  owner_id: string;
  baseline_progress: number;
  sort_order: number;
};

export type Foundation = {
  id: string;
  code: string;
  zone_id: string;
  owner_id: string;
  current_stage: string;
  progress: number;
  status: string;
  first_work_date: string | null;
  last_work_date: string | null;
};

export type ReportRow = {
  id: string;
  report_date: string;
  leader_id: string;
  workers: number;
  technical_staff: number;
  issue_text: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkItemRow = {
  id: string;
  report_id: string;
  zone_id: string;
  stage: string;
  quantity: number;
  unit: string;
  progress: number;
  foundation_codes: string[];
  note: string | null;
  created_at: string;
};

export type Milestone = {
  id: number;
  label: string;
  start_date: string;
  finish_date: string;
  note: string | null;
  sort_order: number;
};

export type PhotoRow = {
  id: string;
  report_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
};
