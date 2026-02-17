<script setup lang="ts">
import { Card as PvCard } from 'primevue'
import { twJoin } from 'tailwind-merge'
const props = defineProps<{
  class?: string
}>()
const bodyClass = twJoin(
  'bg-surface-50 p-5 w-auto border-primary card-shadow max-h-dvh rounded-border shadow-(--p-card-shadow)',
  props.class ?? '',
)
</script>
<template>
  <div :class="bodyClass">
    <slot> </slot>
  </div>
</template>
