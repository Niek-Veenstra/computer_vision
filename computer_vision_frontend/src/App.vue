<script setup lang="ts">
import SidebarProvider from './components/ui/sidebar/SidebarProvider.vue'
import SidebarTrigger from './components/ui/sidebar/SidebarTrigger.vue'
import Content from './ui/layout/Content.vue'
import Sidebar from './ui/layout/Sidebar.vue'
import { useRoute } from 'vue-router'
const route = useRoute()
</script>
<template>
  <SidebarProvider>
    <Sidebar v-if="route.name !== 'login'"></Sidebar>
    <main class="h-full max-h-dvh flex-1 p-4 space-x-4">
      <SidebarTrigger v-if="route.name !== 'login'" />
      <Content></Content>
    </main>
  </SidebarProvider>
</template>
