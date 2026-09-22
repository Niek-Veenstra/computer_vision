<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import NavChip from '@/ui/layout/NavChip.vue'
import { ActivityIcon, FileIcon, HomeIcon, ScanLineIcon } from 'lucide-vue-next'
import { getCurrentUser } from '@/fetch/user'
import { useUserStore } from '@/stores/user'

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarGroup,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar'
import SidebarUser from './sidebar/SidebarUser.vue'
type NavChip = InstanceType<typeof NavChip>['$props']

const route = useRoute()
const userStore = useUserStore()
onMounted(async () => {
  if (route.name === 'settings' || userStore.user) return
  const request = getCurrentUser()
  await request.execute()
  if (request.data.value) userStore.setUser(request.data.value)
})

const navChips: NavChip[] = [
  { icon: HomeIcon, label: 'Home', tooltip: 'Home', to: '/home' },
  { icon: FileIcon, label: 'Documents', tooltip: 'Documents', to: '/documents' },
  { icon: ScanLineIcon, label: 'Scanners', tooltip: 'Scanners', to: '/scanners' },
  { icon: ActivityIcon, label: 'Logging', tooltip: 'Logging', to: '/logging' },
]
</script>
<template>
  <Sidebar collapsible="offcanvas">
    <SidebarHeader class="border-b border-sidebar-border">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" as-child>
            <RouterLink to="/home">
              <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ScanLineIcon class="size-4" aria-hidden="true" />
              </span>
              <span class="grid min-w-0 flex-1 text-left leading-tight">
                <span class="truncate text-sm font-semibold">Math Wiz</span>
                <span class="truncate text-xs text-muted-foreground">Document portal</span>
              </span>
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="navchip in navChips" :key="navchip.label">
              <NavChip
                :tooltip="navchip.tooltip"
                :icon="navchip.icon"
                :label="navchip.label"
                :to="navchip.to"
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter class="border-t border-sidebar-border">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarUser :user="userStore.user" />
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>
