import { z, ZodType } from 'zod'
import { treeifyError } from 'zod'

type ValidationSuccess<T> = {
  success: true
  data: T
  error: null
}

type ValidationFailure<T> = {
  success: false
  error: TreeifiedError<T>
}

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure<T>

type TreeifiedError<T> = {
  properties?: {
    [K in keyof T]?: {
      errors: string[]
    }
  }
}

export const validateScheme = <T extends ZodType>(
  data: unknown,
  schema: T,
): ValidationResult<z.infer<T>> => {
  const result = schema.safeParse(data)

  if (!result.success) {
    return {
      success: false,
      error: treeifyError(result.error) as TreeifiedError<z.infer<T>>,
    }
  }

  return {
    success: true,
    data: result.data,
    error: null,
  }
}
