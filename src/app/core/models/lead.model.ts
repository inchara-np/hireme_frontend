/**
 * Lead domain model.
 *
 * The `lead_type` and `status` string literals used to be re-typed by hand in
 * leads.component.ts, contact.component.ts, student-projects.component.ts and
 * lead-details.component.ts. They now live here only, so the values the forms
 * send and the values the admin panel filters on cannot drift apart.
 *
 * The string values must match what the Go API stores.
 */

export const LEAD_TYPE = {
  Contact: 'contact',
  Freelance: 'freelance',
  Business: 'business',
  StudentProject: 'student_project'
} as const;

export type LeadType = (typeof LEAD_TYPE)[keyof typeof LEAD_TYPE];

export const LEAD_TYPES: readonly LeadType[] = Object.values(LEAD_TYPE);

/** Human-readable label for a lead type, used in the admin UI. */
export const LEAD_TYPE_LABEL: Record<LeadType, string> = {
  [LEAD_TYPE.Contact]: 'Contact',
  [LEAD_TYPE.Freelance]: 'Freelance',
  [LEAD_TYPE.Business]: 'Business',
  [LEAD_TYPE.StudentProject]: 'Student Project'
};

/** Narrows an arbitrary API string to a known lead type. */
export function isLeadType(value: string): value is LeadType {
  return (LEAD_TYPES as readonly string[]).includes(value);
}

export function leadTypeLabel(value: string): string {
  return isLeadType(value)
    ? LEAD_TYPE_LABEL[value]
    : value.replace(/_/g, ' ');
}

export const LEAD_STATUS = {
  New: 'NEW',
  Contacted: 'CONTACTED',
  InProgress: 'IN_PROGRESS',
  Completed: 'COMPLETED',
  Rejected: 'REJECTED'
} as const;

export type LeadStatus = (typeof LEAD_STATUS)[keyof typeof LEAD_STATUS];

export const LEAD_STATUSES: readonly LeadStatus[] = Object.values(LEAD_STATUS);

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  [LEAD_STATUS.New]: 'New',
  [LEAD_STATUS.Contacted]: 'Contacted',
  [LEAD_STATUS.InProgress]: 'In Progress',
  [LEAD_STATUS.Completed]: 'Completed',
  [LEAD_STATUS.Rejected]: 'Rejected'
};

/** Maps a status onto one of the shared `.badge-*` variants. */
export const LEAD_STATUS_TONE: Record<LeadStatus, string> = {
  [LEAD_STATUS.New]: 'badge-info',
  [LEAD_STATUS.Contacted]: 'badge-brand',
  [LEAD_STATUS.InProgress]: 'badge-warning',
  [LEAD_STATUS.Completed]: 'badge-success',
  [LEAD_STATUS.Rejected]: 'badge-danger'
};

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

export function leadStatusLabel(value: string): string {
  return isLeadStatus(value)
    ? LEAD_STATUS_LABEL[value]
    : value.replace(/_/g, ' ');
}

export function leadStatusTone(value: string): string {
  return isLeadStatus(value) ? LEAD_STATUS_TONE[value] : 'badge-neutral';
}

/** Dashboard stat keys returned by `GET /admin/dashboard`. */
export const DASHBOARD_STAT = {
  Total: 'TOTAL',
  New: 'NEW',
  InProgress: 'IN_PROGRESS',
  Completed: 'COMPLETED'
} as const;

/** Urgency values offered on the student project form. */
export const PROJECT_URGENCY = {
  OneWeek: '1_week',
  TwoWeeks: '2_weeks',
  OneMonth: '1_month',
  Flexible: 'flexible'
} as const;

export type ProjectUrgency =
  (typeof PROJECT_URGENCY)[keyof typeof PROJECT_URGENCY];

export const PROJECT_URGENCY_OPTIONS: { value: ProjectUrgency; label: string }[] = [
  { value: PROJECT_URGENCY.OneWeek, label: 'Within 1 week' },
  { value: PROJECT_URGENCY.TwoWeeks, label: 'Within 2 weeks' },
  { value: PROJECT_URGENCY.OneMonth, label: 'Within 1 month' },
  { value: PROJECT_URGENCY.Flexible, label: 'Flexible timeline' }
];

export const PROJECT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'mini', label: 'Mini project' },
  { value: 'major', label: 'Major / final year project' },
  { value: 'ieee', label: 'IEEE paper implementation' },
  { value: 'research', label: 'Research project' },
  { value: 'internship', label: 'Internship project' }
];

export const BRANCH_OPTIONS: { value: string; label: string }[] = [
  { value: 'CSE', label: 'Computer Science' },
  { value: 'ISE', label: 'Information Science' },
  { value: 'AIML', label: 'AI & Machine Learning' },
  { value: 'ECE', label: 'Electronics & Communication' },
  { value: 'EEE', label: 'Electrical & Electronics' },
  { value: 'ME', label: 'Mechanical' },
  { value: 'CV', label: 'Civil' },
  { value: 'OTHER', label: 'Other' }
];

export interface LeadRequest {
  lead_type: LeadType;
  name: string;
  email: string;
  phone: string;
  company?: string;
  college_name?: string;
  branch?: string;
  project_title?: string;
  submission_date?: string;
  urgency?: string;
  description: string;
  attachments: string[];
}

export interface Lead {
  id: string;
  lead_type: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  college_name?: string;
  branch?: string;
  project_title?: string;
  submission_date?: string;
  urgency?: string;
  description: string;
  attachments: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Envelope returned by paginated admin endpoints, e.g.
 * `GET /admin/leads?page=1&pageSize=25`.
 */
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export interface DashboardResponse {
  user_id: string;
  role: string;
  message: string;
  stats: Record<string, number>;
}
