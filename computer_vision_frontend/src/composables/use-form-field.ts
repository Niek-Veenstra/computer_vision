import { ref, computed, watch } from 'vue'

export function useFormField<T>(initialValue: T, transform?: (value: T) => any) {
  const formValue = ref<T>(initialValue)
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
    transform: transform,
    invalid,
  }
}
