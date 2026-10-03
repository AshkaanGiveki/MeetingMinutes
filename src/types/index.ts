export type MeetingStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'READY_FOR_SIGNATURE'
  | 'SIGNING'
  | 'SEALED'
  | 'ARCHIVED';

export interface Participant {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  initials?: string;
  email: string;
  hasSigned?: boolean;
  statusText?: string;
}

export interface AgendaItem {
  id: string;
  order: number;
  text: string;
}

export interface DecisionItem {
  id: string;
  text: string;
  approved: boolean;
}

export interface ActionItem {
  id: string;
  task: string;
  assignee: Participant;
  dueDate: string;
  completed: boolean;
}

export interface CommentItem {
  id: string;
  author: Participant;
  text: string;
  timestamp: string;
  resolved?: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  persianDate: string;
  timeRange: string;
  location: string;
  status: MeetingStatus;
  statusLabel: string;
  organizer: Participant;
  participants: Participant[];
  agenda: AgendaItem[];
  discussion: string;
  aiSuggestion: {
    summary: string;
    applied: boolean;
  };
  decisions: DecisionItem[];
  actionItems: ActionItem[];
  comments: CommentItem[];
  documentHash?: string;
  sealedAt?: string;
  signatureCount: number;
  totalSignaturesRequired: number;
}

export interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  agendaDefaults: string[];
}

export type OrganizationRole =
  | 'Owner'
  | 'Admin'
  | 'Organizer'
  | 'Editor'
  | 'Reviewer'
  | 'Participant'
  | 'Viewer';

export interface AuditRecord {
  id: string;
  meetingId: string;
  action: string;
  actor: string;
  timestamp: string;
  documentHash: string;
  metadata?: Record<string, unknown>;
}
