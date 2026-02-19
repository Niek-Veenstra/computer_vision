<script setup lang="ts">
import { type LucideProps } from 'lucide-vue-next'
import type { FunctionalComponent } from 'vue'
import SidebarMenuButton from '@/components/ui/sidebar/SidebarMenuButton.vue'
const props = defineProps<{
  icon?: FunctionalComponent<LucideProps>
  label?: string
  tooltip?: string
  to: string
}>()
const router = useRouter()
</script>
<template>
  <SidebarMenuButton :tooltip="props.tooltip" as-child>
    <a @click="router.push(props.to)">
      <component :is="props.icon"></component>
      <span>{{ props.label }}</span>
    </a>
  </SidebarMenuButton>
</template>
