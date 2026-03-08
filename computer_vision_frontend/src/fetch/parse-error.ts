import type { UseFetchReturn } from '@vueuse/core'

export const parseError = async (response: UseFetchReturn<any>) => {
  const reader = response.response.value?.body?.getReader()
  if (!reader) return
  const { value, done } = await reader.read()

  if (!done && value) {
    const text = new TextDecoder().decode(value)
    return JSON.parse(text)
  }
}
