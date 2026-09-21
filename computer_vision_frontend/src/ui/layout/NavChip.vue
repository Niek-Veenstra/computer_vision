<script setup lang="ts">
import { type LucideProps } from 'lucide-vue-next'
import type { FunctionalComponent } from 'vue'
import { useRoute } from 'vue-router'
import SidebarMenuButton from '@/components/ui/sidebar/SidebarMenuButton.vue'
const props = defineProps<{
  icon?: FunctionalComponent<LucideProps>
  label?: string
  tooltip?: string
  to: string
}>()
const route = useRoute()
</script>
<template>
  <SidebarMenuButton
    :tooltip="props.tooltip"
    :is-active="route.path === props.to || route.path.startsWith(`${props.to}/`)"
    as-child
  >
    <RouterLink :to="props.to">
      <component :is="props.icon"></component>
      <span>{{ props.label }}</span>
    </RouterLink>
  </SidebarMenuButton>
</template>
