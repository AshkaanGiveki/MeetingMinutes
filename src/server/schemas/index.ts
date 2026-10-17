import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  email: z.string().email(),
  role: z.string(),
  avatar: z.string().optional(),
  telegramId: z.string().optional(),
  totpSecret: z.string().optional(),
  totpEnabled: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserType = z.infer<typeof UserSchema>;

export const MeetingStatusEnum = z.enum([
  'DRAFT',
  'IN_REVIEW',
  'READY_FOR_SIGNATURE',
  'SIGNING',
  'SEALED',
  'ARCHIVED',
]);

export const AgendaItemSchema = z.object({
  id: z.string(),
  order: z.number().int().positive(),
  text: z.string().min(1),
});

export const DecisionItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  approved: z.boolean().default(true),
});

export const ActionItemSchema = z.object({
  id: z.string(),
  task: z.string().min(1),
  assigneeId: z.string(),
  assigneeName: z.string(),
  assigneeAvatar: z.string().optional(),
  dueDate: z.string(),
  completed: z.boolean().default(false),
});

export const CommentItemSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  authorAvatar: z.string().optional(),
  text: z.string().min(1),
  timestamp: z.string(),
  resolved: z.boolean().default(false),
  parentId: z.string().optional(),
});

export const CreateMeetingSchema = z.object({
  organizationMinuteId: z.number().int().positive().max(2_147_483_647).optional(),
  title: z.string().min(3),
  persianDate: z.string().min(6),
  timeRange: z.string().min(3),
  location: z.string().min(2),
  description: z.string().optional(),
  templateId: z.string().optional(),
  contentTemplateId: z.string().optional(),
  printTemplateId: z.string().optional(),
  participantIds: z.array(z.string()).optional(),
  participantAssignments: z.array(z.object({
    id: z.string().min(1),
    role: z.enum(['Editor', 'Reviewer', 'Signer', 'Viewer', 'Participant']).optional(),
    roles: z.array(z.enum(['Editor', 'Reviewer', 'Signer', 'Viewer', 'Participant'])).max(5).optional(),
    requiresSignature: z.boolean().optional(),
  })).max(100).optional(),
  agenda: z.array(AgendaItemSchema).optional(),
  decisions: z.array(DecisionItemSchema).optional(),
  actionItems: z.array(ActionItemSchema).optional(),
});

export const SignDocumentSchema = z.object({
  meetingId: z.string(),
  signerId: z.string().optional(),
  signerName: z.string().min(2).optional(),
  signerRole: z.string().optional(),
  signatureType: z.enum(['draw', 'type', 'upload', 'telegram']),
  signatureData: z.string().min(1),
  intentConfirmed: z.boolean().refine(val => val === true, {
    message: 'Explicit user intent consent is mandatory.',
  }),
});

export const SealDocumentSchema = z.object({
  meetingId: z.string(),
  enforceAllSignatures: z.boolean().default(true),
});

export const TelegramAuthVerifySchema = z.object({
  initData: z.string().min(10),
});

export const AiSuggestSchema = z.object({
  meetingId: z.string().optional(),
  action: z.string().max(80).optional(),
  text: z.string().max(100_000).optional().default(''),
  meetingTitle: z.string().max(500).optional(),
  agenda: z.unknown().optional(),
  audioData: z.string().max(25_000_000).optional(),
  audioMimeType: z.string().max(100).optional(),
});

export const AiSuggestionResponseSchema = z.object({
  summary: z.string().max(20_000).optional(),
  title: z.string().max(500).optional(),
  discussion: z.string().max(100_000).optional(),
  agenda: z.array(z.string().max(2_000)).max(50).optional(),
  keyDecisions: z.array(z.string().max(2_000)).max(50).optional(),
  suggestedTasks: z.array(z.record(z.string(), z.unknown())).max(50).optional(),
});
