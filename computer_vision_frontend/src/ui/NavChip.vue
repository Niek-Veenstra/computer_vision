<script setup lang="ts">
import { RouterLink } from 'vue-router'
const props = defineProps<{
  icon?: string
  label?: string
  tooltip?: string
  to: string
}>()
</script>
<template>
  <router-link custom v-bind="$props" v-slot="{ isActive, navigate }">
    <div
      class="hover:pointer transition-all rounded-2xl hover:text-white text-xl flex space-y-2.5 justify-center md:justify-start items-center space-x-3"
    >
      <Button
        :class="`${isActive ? 'bg-primary text-primary-contrast' : 'bg-surface-50 hover:bg-emphasis text-muted-color'} border-surface-50 `"
        severity="secondary"
        size="large"
        @click="navigate"
        v-tooltip.right="props.tooltip"
        :icon="`pi ${props.icon}`"
      ></Button>
    </div>
  </router-link>
</template>
