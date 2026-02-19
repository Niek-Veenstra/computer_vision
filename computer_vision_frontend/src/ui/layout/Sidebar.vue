<script setup lang="ts">
import NavChip from '@/ui/layout/NavChip.vue'
import Avatar from '@/components/ui/avatar/Avatar.vue'
import Separator from '@/components/ui/separator/Separator.vue'
import { ArrowRightFromLineIcon, FileIcon, HomeIcon } from 'lucide-vue-next'

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarGroup,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { AspectRatio } from 'reka-ui'
import Settings from './sidebar/Settings.vue'
type NavChip = InstanceType<typeof NavChip>['$props']

const navChips: NavChip[] = [
  { icon: HomeIcon, label: 'Home', tooltip: 'Home', to: '/home' },
  { icon: FileIcon, label: 'Documents', tooltip: 'Documents', to: '/documents' },
  { icon: ArrowRightFromLineIcon, label: 'Exporter', tooltip: 'Exporter', to: '/exporter' },
]
</script>
<template>
  <Sidebar variant="floating" collapsible="icon">
    <SidebarHeader>
      <AspectRatio>
        <img width="100" src="./../../../public/logo.png" alt="Not Found." />
      </AspectRatio>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel> Applications </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="navchip in navChips" :key="navchip.label">
              <NavChip
                :tooltip="navchip.tooltip"
                :icon="navchip.icon"
                :label="navchip.label"
                :to="navchip.to"
                as-child
              ></NavChip>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      <Settings></Settings>
      <Separator></Separator>
      <div class="flex justify-center">
        <Avatar shape="circle" label="U" size="large" />
      </div>
    </SidebarFooter>
  </Sidebar>
</template>
