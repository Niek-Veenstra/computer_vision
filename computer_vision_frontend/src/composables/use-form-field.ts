import { ref, computed, watch } from 'vue'

export function useFormField<T>(initialValue: T) {
  const formValue = ref<T>(initialValue)
  const error = ref<string | null>(null)

  const invalid = computed(() => error.value !== null)

  watch(formValue, (newVal, oldVal) => {
    if (newVal !== oldVal) {
      error.value = null
    }
  })

  return {
    formValue: formValue,
    error,
    invalid,
  }
}
