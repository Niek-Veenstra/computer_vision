import { ref, computed, shallowRef, watch } from 'vue'
import type { ComputedRef, Ref, ShallowRef } from 'vue'

type FormField<T> = {
  formValue: ShallowRef<T>
  error: Ref<string | null>
  invalid: ComputedRef<boolean>
}

export function useFormField<T>(initialValue: T): FormField<T>
export function useFormField<T, Output>(
  initialValue: T,
  transform: (value: T) => Output,
): FormField<T> & { transform: (value: T) => Output }
export function useFormField<T, Output>(initialValue: T, transform?: (value: T) => Output) {
  const formValue = shallowRef<T>(initialValue)
  const error = ref<string | null>(null)

  const invalid = computed(() => error.value !== null)

  watch(formValue, (newVal, oldVal) => {
    if (newVal !== oldVal) {
      error.value = null
    }
  })

  return {
    formValue,
    error,
    transform,
    invalid,
  }
}
