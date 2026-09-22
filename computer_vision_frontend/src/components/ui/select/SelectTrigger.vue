<script setup lang="ts">
import type { SelectTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ChevronDownIcon } from 'lucide-vue-next'
import { SelectTrigger as RekaSelectTrigger } from 'reka-ui'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const props = defineProps<SelectTriggerProps & { class?: HTMLAttributes['class'] }>()
const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <RekaSelectTrigger
    data-slot="select-trigger"
    v-bind="{ ...$attrs, ...delegatedProps }"
    :class="cn('border-input bg-background dark:bg-input/30 flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground [&>span]:truncate', props.class)"
  >
    <slot />
    <ChevronDownIcon class="size-4 shrink-0 text-muted-foreground opacity-70" aria-hidden="true" />
  </RekaSelectTrigger>
</template>
