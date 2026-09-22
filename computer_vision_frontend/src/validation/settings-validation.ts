import * as z from 'zod'

export const profileScheme = z.object({
  firstName: z.string().trim().min(1, 'Please enter your first name').max(100),
  lastName: z.string().trim().min(1, 'Please enter your last name').max(100),
  email: z.email('Please enter a valid email').max(254),
  logoDataUrl: z.string().nullable(),
})

export const passwordChangeScheme = z
  .object({
    currentPassword: z.string().min(1, 'Please enter your current password'),
    newPassword: z.string().min(8, 'Use at least 8 characters').max(128),
    passwordConfirm: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((values) => values.newPassword === values.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  })
