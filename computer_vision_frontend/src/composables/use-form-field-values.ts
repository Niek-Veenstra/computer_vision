import { computed } from 'vue'

type FieldInput = {
  formValue: { value: unknown }
  transform?: (value: never) => unknown
}

type FieldValue<Field extends FieldInput> = Field extends {
  transform: (value: never) => infer Output
}
  ? Output
  : Field['formValue']['value']

type FormValues<Fields extends Record<string, FieldInput>> = {
  [Key in keyof Fields]: FieldValue<Fields[Key]>
}

export function useFormFieldValues<Fields extends Record<string, FieldInput>>(fields: Fields) {
  return computed<FormValues<Fields>>(() => {
    const result = {} as FormValues<Fields>
    for (const key of Object.keys(fields) as Array<keyof Fields>) {
      const field = fields[key]
      if (!field) continue
      let value: unknown = field.formValue.value
      if (field.transform) value = field.transform(value as never)
      result[key] = value as FormValues<Fields>[typeof key]
    }
    return result
  })
}
