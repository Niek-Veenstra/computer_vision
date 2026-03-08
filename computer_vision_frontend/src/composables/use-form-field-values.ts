export const useFormFieldValues = <T extends Record<string, { formValue: Ref<any> }>>(
  fields: T,
) => {
  type FieldKey = keyof typeof fields
  return computed(() => {
    const result = {} as Record<FieldKey, any>
    for (const key in fields) {
      result[key as FieldKey] = fields[key as FieldKey]?.formValue.value
    }

    return result
  })
}
