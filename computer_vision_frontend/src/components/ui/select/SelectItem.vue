<script setup lang="ts">
import type { SelectItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { CheckIcon } from 'lucide-vue-next'
import {
  SelectItem as RekaSelectItem,
  SelectItemIndicator,
  SelectItemText,
} from 'reka-ui'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const props = defineProps<SelectItemProps & { class?: HTMLAttributes['class'] }>()
const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <RekaSelectItem
    data-slot="select-item"
    v-bind="{ ...$attrs, ...delegatedProps }"
    :class="cn('focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50', props.class)"
  >
    <SelectItemText><slot /></SelectItemText>
    <span class="absolute right-2 flex size-4 items-center justify-center">
      <SelectItemIndicator>
        <CheckIcon class="size-4" aria-hidden="true" />
      </SelectItemIndicator>
    </span>
  </RekaSelectItem>
</template>
