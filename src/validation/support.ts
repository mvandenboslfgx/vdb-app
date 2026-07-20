import { z } from 'zod';

export const supportTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, 'errors.validation.subjectMin')
    .max(160, 'errors.validation.subjectMax'),
  category: z.enum(['billing', 'project', 'technical', 'account', 'other'], {
    error: 'errors.validation.categoryRequired',
  }),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  description: z
    .string()
    .trim()
    .min(10, 'errors.validation.descriptionMin')
    .max(5000, 'errors.validation.descriptionMax'),
  projectId: z.string().uuid().optional().or(z.literal('')),
});

export type SupportTicketInput = z.infer<typeof supportTicketSchema>;
