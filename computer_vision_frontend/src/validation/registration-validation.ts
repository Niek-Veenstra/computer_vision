import * as z from 'zod'
export const userRegistrationScheme = z.object({
  firstName: z.string('Please enter text').nonempty('Please enter your first name'),
  lastName: z.string('Please enter text').nonempty('Please enter your last name'),
  email: z.email('Please enter a valid email'),
  password: z.string('Please enter your password').nonempty('Please enter your password'),
  passwordConfirm: z.string('Please enter your password').nonempty('Please confirm your password'),
})
