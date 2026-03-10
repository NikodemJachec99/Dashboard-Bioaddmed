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
  project?: number;
  column?: number | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee?: number | null;
  due_date?: string;
  order?: number;
  actual_hours?: string | number | null;
  estimated_hours?: string | number | null;
  created_by?: number | null;
  completed_at?: string | null;
  assignee_email?: string;
  is_blocker?: boolean;
  comments?: TaskComment[];
  checklist_items?: TaskChecklistItem[];
};

export type KanbanColumn = {
  id: number;
  name: string;
  order: number;
  color: string;
  tasks: Task[];
};

export type KanbanBoard = {
  id: number;
  name: string;
  project: number;
  columns: KanbanColumn[];
};

export type TaskComment = {
  id: number;
  author?: number | null;
  author_email?: string;
  content: string;
  created_at: string;
};

export type TaskChecklistItem = {
  id: number;
  content: string;
  is_done: boolean;
  order: number;
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
  milestones?: ProjectMilestone[];
  risks?: ProjectRisk[];
  recruitment_openings?: RecruitmentOpening[];
  tasks?: Task[];
};

export type ProjectMilestone = {
  id: number;
  title: string;
  description: string;
  due_date?: string | null;
  status: "planned" | "in_progress" | "completed" | "blocked";
  progress_percent: number;
  created_at: string;
  updated_at: string;
};

export type ProjectRisk = {
  id: number;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  impact: string;
  mitigation_plan: string;
  owner?: number | null;
  owner_email?: string;
  status: "open" | "monitored" | "mitigated" | "closed";
  created_at: string;
  updated_at: string;
};

export type RecruitmentApplication = {
  id: number;
  applicant?: number | null;
  applicant_email?: string;
  motivation: string;
  availability_note: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

export type RecruitmentOpening = {
  id: number;
  title: string;
  description: string;
  required_competencies: string[];
  slots: number;
  weekly_hours: number;
  deadline?: string | null;
  is_open: boolean;
  applications: RecruitmentApplication[];
  created_at: string;
  updated_at: string;
};

export type MeetingParticipant = {
  id: number;
  user: number;
  user_email: string;
  attendance_status: string;
  presence_confirmed_at?: string | null;
};

export type MeetingActionItem = {
  id: number;
  task?: number | null;
  description: string;
  assignee?: number | null;
  assignee_email?: string;
  due_date?: string | null;
  created_at: string;
};

export type Meeting = {
  id: number;
  title: string;
  description: string;
  meeting_type: string;
  related_project?: number | null;
  organizer?: number | null;
  start_at: string;
  end_at: string;
  location?: string;
  online_url?: string;
  agenda?: string;
  notes?: string;
  status: string;
  participants?: MeetingParticipant[];
  action_items?: MeetingActionItem[];
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
  related_project?: number | null;
  eligible_users?: number[];
  quorum_required?: number;
  threshold_type?: string;
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
  visibility?: string;
  related_project?: number | null;
  content: string;
  is_pinned: boolean;
  version?: number;
  author_email?: string;
  created_at?: string;
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
  reserved_by?: number;
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
  caretaker?: number | null;
  caretaker_email?: string;
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
  generated_by?: number | null;
  generated_by_email?: string;
  parameters_json?: Record<string, unknown>;
  file_path: string;
  created_at: string;
};

export type DashboardOverview = {
  active_projects: number;
  members: number;
  my_tasks: number;
  upcoming_meetings: number;
  active_polls: number;
  announcements: number;
};

export type DashboardMySummary = {
  today_tasks: number;
  week_tasks: number;
  meetings: number;
  notifications: number;
};

export type DashboardAdminSummary = {
  projects_at_risk: number;
  overdue_tasks: number;
  blocked_tasks: number;
  members_without_project: number;
};

export type ProjectHealth = {
  id: number;
  name: string;
  status: string;
  stage: string;
  progress_percent: number;
  member_count: number;
  task_count: number;
};
