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
  /** The person's functional title for this specific meeting, separate from workflow roles. */
  title?: string;
  /** Canonical multi-role assignment; role is retained as a legacy primary role. */
  roles?: MeetingRole[];
  avatar?: string;
  initials?: string;
  email: string;
  hasSigned?: boolean;
  statusText?: string;
  requiresSignature?: boolean;
  membershipStatus?: 'active' | 'invited' | 'pending';
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
  requiredMeetingRoles?: Array<'Editor' | 'Reviewer' | 'Signer'>;
  signatures?: SignatureRecord[];
  signatureRejection?: {
    id: string;
    signerId: string;
    signerName: string;
    reason: string;
    createdAt: string;
    status: 'pending' | 'accepted' | 'rejected';
    editorResponse?: string;
  };
  /** Legacy content-template field retained for older records. */
  templateId?: string;
  contentTemplateId?: string;
  printTemplateId?: string;
}

export interface SignatureRecord {
  id: string;
  meetingId: string;
  signerId: string;
  signerName: string;
  signerRole: string;
  signatureType: 'draw' | 'type' | 'upload' | 'telegram';
  signatureData: string;
  signedAt: string;
  documentHash: string;
}

export interface MinuteContentTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  agendaDefaults: string[];
}

export interface PrintTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  pdfStyle: 'classic' | 'modern' | 'minimal';
}

export type Template = MinuteContentTemplate;

export type OrganizationRole =
  | 'Owner'
  | 'Admin'
  | 'User';

export type MeetingRole =
  | 'Organizer'
  | 'Editor'
  | 'Reviewer'
  | 'Signer'
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
