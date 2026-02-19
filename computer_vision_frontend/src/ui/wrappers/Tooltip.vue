<script setup lang="ts">
import { TooltipContent, TooltipTrigger, TooltipProvider, Tooltip } from '@/components/ui/tooltip'

type TooltipContentProps = InstanceType<typeof TooltipContent>['$props']

const props = defineProps<{
  tooltip?: string
  side?: TooltipContentProps['side']
}>()
</script>
<template>
  <template v-if="!!props.tooltip">
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <slot></slot>
        </TooltipTrigger>
        <TooltipContent :side="props.side">
          {{ props.tooltip }}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </template>
  <template v-else>
    <slot></slot>
  </template>
</template>
