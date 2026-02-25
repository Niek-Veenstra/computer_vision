import * as z from 'zod'
export const loginScheme = z.object({
  email: z.email('Please enter a valid email'),
  password: z.string('Please enter your password').nonempty('Password cannot be empty'),
})
