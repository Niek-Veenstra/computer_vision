<script setup lang="ts">
import Content from './ui/Content.vue'
import Sidebar from './ui/Sidebar.vue'
</script>
<template>
  <div class="min-h-dvh max-h-dvh flex flex-col">
    <main class="flex h-full flex-1 p-4 space-x-4">
      <Sidebar></Sidebar>
      <Content></Content>
    </main>
  </div>
</template>
