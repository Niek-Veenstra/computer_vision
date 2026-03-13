export const setFieldErrors = <T extends Record<string, { error: Ref<string | null> }>>(
  formFields: T,
  errors: { [key: string]: string },
) => {
  Object.entries(formFields).forEach(([formFieldKey, value]) => {
    const error = Object.entries(errors).find(([errorKey]) => formFieldKey == errorKey)
    if (error) {
      value.error.value = error[1]
    }
  })
}
