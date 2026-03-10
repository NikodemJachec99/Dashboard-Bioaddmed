export type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  global_role: "admin" | "member";
  avatar?: string;
  bio?: string;
  year_of_study?: string;
  field_of_study?: string;
  specialization?: string;
  interests?: string[];
  technologies?: string[];
  experience?: string;
  weekly_availability_hours?: number;
  joined_at?: string;
  is_active_member?: boolean;
  achievements_summary?: string;
  is_active?: boolean;
};

export type UserSkill = {
  id: number;
  name: string;
  category: string;
  proficiency: string;
};

export type ProjectMembership = {
  id: number;
  user: number;
  user_email: string;
  user_name: string;
  project_role: "coordinator" | "member";
  joined_at?: string;
  is_active?: boolean;
};

export type Task = {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date?: string;
  assignee_email?: string;
  is_blocker?: boolean;
};

export type KanbanColumn = {
  id: number;
  name: string;
  order: number;
  color: string;
  tasks: Task[];
};

export type Project = {
  id: number;
  name: string;
  slug: string;
  short_description: string;
  full_description?: string;
  category: string;
  project_type?: string;
  stage: string;
  status: string;
  progress_percent: number;
  start_date?: string;
  planned_end_date?: string;
  actual_end_date?: string;
  memberships: ProjectMembership[];
  tasks?: Task[];
};

export type Meeting = {
  id: number;
  title: string;
  description: string;
  meeting_type: string;
  start_at: string;
  end_at: string;
  location?: string;
  online_url?: string;
  status: string;
};

export type VoteOption = {
  id: number;
  label: string;
  order: number;
  votes?: number;
};

export type VotePoll = {
  id: number;
  title: string;
  description: string;
  poll_type: string;
  audience_type: string;
  visibility_type: string;
  status: string;
  starts_at: string;
  ends_at: string;
  options: VoteOption[];
};

export type KnowledgeArticle = {
  id: number;
  title: string;
  slug: string;
  category: string;
  content: string;
  is_pinned: boolean;
  updated_at: string;
};

export type Announcement = {
  id: number;
  title: string;
  content: string;
  audience_type: string;
  start_at: string;
  expires_at?: string;
  is_pinned: boolean;
};

export type Notification = {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  url?: string;
};

export type Reservation = {
  id: number;
  resource: number;
  reserved_by_email: string;
  start_at: string;
  end_at: string;
  purpose: string;
  status: string;
};

export type Resource = {
  id: number;
  title: string;
  description: string;
  location: string;
  rules: string;
  is_active: boolean;
};

export type Achievement = {
  id: number;
  title: string;
  category: string;
  description: string;
  issued_at?: string;
};

export type ReportSnapshot = {
  id: number;
  report_type: string;
  file_path: string;
  created_at: string;
};
