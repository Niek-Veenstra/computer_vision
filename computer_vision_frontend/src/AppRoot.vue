<script setup lang="ts">
import SidebarProvider from './components/ui/sidebar/SidebarProvider.vue'
import Content from './ui/layout/AppContent.vue'
import Sidebar from './ui/layout/AppSidebar.vue'
import AppBreadcrumbs from './ui/layout/AppBreadcrumbs.vue'
import { useRoute } from 'vue-router'
const route = useRoute()
</script>
<template>
  <SidebarProvider>
    <Sidebar v-if="route.name !== 'login' && route.name !== 'register'"></Sidebar>
    <main class="flex min-h-svh min-w-0 flex-1 flex-col">
      <AppBreadcrumbs />
      <Content></Content>
    </main>
  </SidebarProvider>
</template>
