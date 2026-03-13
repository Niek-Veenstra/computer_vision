export const useFormFieldValues = <
  T extends Record<string, { formValue: Ref<any>; transform?: (a: any) => any }>,
>(
  fields: T,
) => {
  type FieldKey = keyof typeof fields
  return computed(() => {
    const result = {} as Record<FieldKey, any>
    for (const key in fields) {
      const transform = fields[key as FieldKey]?.transform
      const rawValue = fields[key as FieldKey]?.formValue.value
      const value = transform ? transform(rawValue) : rawValue
      result[key as FieldKey] = value
    }

    return result
  })
}
