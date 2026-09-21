<script setup lang="ts">
import { SettingsIcon } from 'lucide-vue-next'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { saveThemeService } from '@/services/save-theme'

const setDark = () => document.getElementsByTagName('html')[0]?.classList.add('dark')
const removeDark = () => document.getElementsByTagName('html')[0]?.classList.remove('dark')
switch (saveThemeService.getTheme()) {
  case 'dark':
    setDark()
    break
  case 'light':
    removeDark()
}
</script>
<template>
  <SidebarMenuButton tooltip="Settings" as-child>
    <RouterLink to="/settings">
      <SettingsIcon />
      <span>Settings</span>
    </RouterLink>
  </SidebarMenuButton>
</template>
