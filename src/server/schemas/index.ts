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
  title: z.string().min(3),
  persianDate: z.string().min(6),
  timeRange: z.string().min(3),
  location: z.string().min(2),
  description: z.string().optional(),
  templateId: z.string().optional(),
  participantIds: z.array(z.string()).optional(),
});

export const SignDocumentSchema = z.object({
  meetingId: z.string(),
  signerId: z.string().optional(),
  signerName: z.string().min(2),
  signerRole: z.string(),
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
