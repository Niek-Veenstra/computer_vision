import * as z from 'zod'

export const createScannerScheme = z.object({
  name: z
    .string('Please enter a scanner name')
    .trim()
    .min(1, 'Please enter a scanner name')
    .max(100, 'Use 100 characters or fewer'),
})
