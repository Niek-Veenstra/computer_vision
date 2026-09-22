<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { EllipsisVerticalIcon, LogOutIcon, SettingsIcon } from 'lucide-vue-next'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import Avatar from '@/components/ui/avatar/Avatar.vue'
import AvatarFallback from '@/components/ui/avatar/AvatarFallback.vue'
import AvatarImage from '@/components/ui/avatar/AvatarImage.vue'
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar'
import type { User } from '@/domain/user'
import { useTokenStore } from '@/stores/token'

const props = defineProps<{ user: User | null }>()
const router = useRouter()
const tokenStore = useTokenStore()
const { isMobile, setOpenMobile } = useSidebar()

const accountName = computed(() => {
  if (!props.user) return 'Account'
  return `${props.user.firstName} ${props.user.lastName}`.trim()
})

const accountInitials = computed(() => {
  if (!props.user) return 'U'
  return `${props.user.firstName.charAt(0)}${props.user.lastName.charAt(0)}`.toUpperCase()
})

function openSettings() {
  if (isMobile.value) setOpenMobile(false)
  void router.push({ name: 'settings' })
}

function logOut() {
  tokenStore.setToken(null)
  if (isMobile.value) setOpenMobile(false)
  void router.replace({ name: 'login' })
}
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <SidebarMenuButton
        size="lg"
        class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        aria-label="Account menu"
      >
        <Avatar class="size-8 rounded-lg">
          <AvatarImage v-if="user?.logoDataUrl" :src="user.logoDataUrl" :alt="accountName" />
          <AvatarFallback class="rounded-lg bg-sidebar-accent text-xs font-semibold">
            {{ accountInitials }}
          </AvatarFallback>
        </Avatar>
        <span class="grid min-w-0 flex-1 text-left leading-tight">
          <span class="truncate text-sm font-medium">{{ accountName }}</span>
          <span class="truncate text-xs text-muted-foreground">{{ user?.email ?? 'Signed in' }}</span>
        </span>
        <EllipsisVerticalIcon class="ml-auto size-4 shrink-0" aria-hidden="true" />
      </SidebarMenuButton>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        class="z-50 min-w-56 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        :side="isMobile ? 'bottom' : 'right'"
        align="end"
        :side-offset="4"
      >
        <DropdownMenuItem
          class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground"
          @select="openSettings"
        >
          <SettingsIcon class="size-4" aria-hidden="true" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator class="-mx-1 my-1 h-px bg-border" />
        <DropdownMenuItem
          class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground"
          @select="logOut"
        >
          <LogOutIcon class="size-4" aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
