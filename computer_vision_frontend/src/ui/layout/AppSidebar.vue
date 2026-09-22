<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import NavChip from '@/ui/layout/NavChip.vue'
import Avatar from '@/components/ui/avatar/Avatar.vue'
import AvatarFallback from '@/components/ui/avatar/AvatarFallback.vue'
import AvatarImage from '@/components/ui/avatar/AvatarImage.vue'
import { ArrowRightFromLineIcon, FileIcon, HomeIcon, ScanLineIcon } from 'lucide-vue-next'
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
import Settings from './sidebar/SidebarSettings.vue'
type NavChip = InstanceType<typeof NavChip>['$props']

const route = useRoute()
const userStore = useUserStore()
const accountName = computed(() => {
  if (!userStore.user) return 'Account'
  return `${userStore.user.firstName} ${userStore.user.lastName}`.trim()
})
const accountInitials = computed(() => {
  if (!userStore.user) return 'U'
  return `${userStore.user.firstName.charAt(0)}${userStore.user.lastName.charAt(0)}`.toUpperCase()
})

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
  { icon: ArrowRightFromLineIcon, label: 'Exporter', tooltip: 'Exporter', to: '/exporter' },
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
          <Settings />
        </SidebarMenuItem>
      </SidebarMenu>
      <div class="flex items-center gap-3 rounded-md px-2 py-1.5">
        <Avatar>
          <AvatarImage
            v-if="userStore.user?.logoDataUrl"
            :src="userStore.user.logoDataUrl"
            alt="Account logo"
          />
          <AvatarFallback class="bg-sidebar-accent text-xs font-semibold">
            {{ accountInitials }}
          </AvatarFallback>
        </Avatar>
        <div class="grid min-w-0 flex-1 text-left leading-tight">
          <span class="truncate text-sm font-medium">{{ accountName }}</span>
          <span class="truncate text-xs text-muted-foreground">
            {{ userStore.user?.email ?? 'Signed in' }}
          </span>
        </div>
      </div>
    </SidebarFooter>
  </Sidebar>
</template>
