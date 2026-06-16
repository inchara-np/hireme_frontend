export interface LeadRequest {
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

export interface DashboardResponse {
  user_id: string;
  role: string;
  message: string;
  stats: Record<string, number>;
}
