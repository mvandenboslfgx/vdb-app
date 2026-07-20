import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'errors.validation.emailRequired')
  .email('errors.validation.emailInvalid');

const passwordSchema = z
  .string()
  .min(8, 'errors.validation.passwordMin')
  .max(128, 'errors.validation.passwordMax');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'errors.validation.passwordRequired'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'errors.validation.fullNameMin')
      .max(120, 'errors.validation.fullNameMax'),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .max(32, 'errors.validation.phoneMax')
      .optional()
      .or(z.literal('')),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'errors.validation.confirmPasswordRequired'),
    acceptTerms: z.literal(true, {
      error: 'errors.validation.acceptTerms',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'errors.validation.passwordMismatch',
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
    confirmPassword: z.string().min(1, 'errors.validation.confirmPasswordRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'errors.validation.passwordMismatch',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
