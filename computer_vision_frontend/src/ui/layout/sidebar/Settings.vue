<script setup lang="ts">
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SettingsIcon, SunMoonIcon, XIcon } from 'lucide-vue-next'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { PopoverClose } from 'reka-ui'
import Button from '@/components/ui/button/Button.vue'
import { saveThemeService } from '@/services/save-theme'

const setDark = () => document.getElementsByTagName('html')[0]?.classList.add('dark')
const removeDark = () => document.getElementsByTagName('html')[0]?.classList.remove('dark')
console.log(saveThemeService.getTheme())
switch (saveThemeService.getTheme()) {
  case 'dark':
    setDark()
    break
  case 'light':
    removeDark()
}

const toggle = () => {
  const element = document.getElementsByTagName('html')[0]
  if (element?.classList.contains('dark')) {
    removeDark()
    saveThemeService.saveTheme('light')
    return
  }
  setDark()
  saveThemeService.saveTheme('dark')
}
</script>
<template>
  <Popover as-child>
    <PopoverTrigger as-child>
      <SidebarMenuButton tooltip="Settings" as-child>
        <router-link custom to="/settings" v-slot="{ navigate }">
          <a @click="navigate">
            <SettingsIcon />
            <span>Settings</span>
            <PopoverContent class="flex flex-col w-40" side="right">
              <PopoverClose class="ml-auto pb-2" aria-label="Close">
                <Button variant="ghost" size="icon-sm">
                  <XIcon></XIcon>
                </Button>
              </PopoverClose>
              <Button @click="toggle" variant="outline">
                <SunMoonIcon></SunMoonIcon>
                Toggle theme
              </Button>
            </PopoverContent>
          </a>
        </router-link>
      </SidebarMenuButton>
    </PopoverTrigger>
  </Popover>
</template>
