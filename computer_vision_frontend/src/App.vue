<script setup lang="ts">
import Content from './ui/Content.vue'
import Sidebar from './ui/Sidebar.vue'
import { useRoute } from 'vue-router'
const route = useRoute()
</script>
<template>
  <div class="min-h-dvh max-h-dvh flex flex-col">
    <main class="flex h-full max-h-dvh flex-1 p-4 space-x-4">
      <Sidebar v-if="route.name !== 'login'"></Sidebar>
      <Content></Content>
    </main>
  </div>
</template>
