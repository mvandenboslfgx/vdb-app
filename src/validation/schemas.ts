import { z } from 'zod';

export const emailSchema = z.string().trim().email();

export const passwordSchema = z
  .string()
  .min(8, 'password_too_short')
  .max(128, 'password_too_long');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'password_required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true),
    acceptPrivacy: z.literal(true),
    accountIntent: z.enum(['customer', 'partner_application']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'password_mismatch',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'password_mismatch',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const partnerApplicationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  companyName: z.string().trim().max(160).optional(),
  email: emailSchema,
  phone: z.string().trim().min(8).max(32),
  country: z.string().trim().min(2).max(56),
  experience: z.string().trim().min(10).max(2000),
  salesChannel: z.string().trim().min(2).max(200),
  motivation: z.string().trim().min(10).max(2000),
  acceptPartnerRules: z.literal(true),
  acceptPrivacy: z.literal(true),
});

export type PartnerApplicationInput = z.infer<typeof partnerApplicationSchema>;

export const quoteAcceptSchema = z.object({
  quoteId: z.string().uuid(),
  acceptTerms: z.literal(true),
  acceptPrivacy: z.boolean().optional(),
  confirmation: z.literal(true),
});

export type QuoteAcceptInput = z.infer<typeof quoteAcceptSchema>;

export const projectRequestSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(5000),
  category: z.enum([
    'website',
    'webshop',
    'custom',
    'automation',
    'ai',
    'advice',
    'other',
  ]),
});

export type ProjectRequestInput = z.infer<typeof projectRequestSchema>;

export const supportTicketSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  category: z.string().trim().min(2).max(80),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  description: z.string().trim().min(10).max(5000),
});

export type SupportTicketInput = z.infer<typeof supportTicketSchema>;

export const documentChangesSchema = z.object({
  documentId: z.string().uuid(),
  reason: z.string().trim().min(5).max(2000),
});

export type DocumentChangesInput = z.infer<typeof documentChangesSchema>;

export const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: z.string().trim().max(32).optional(),
  notes: z.string().trim().max(2000).optional(),
  consentConfirmed: z.literal(true),
});

export type LeadInput = z.infer<typeof leadSchema>;
