<script setup lang="ts">
import PageContainer from './PageContainer.vue'
</script>

<template>
  <PageContainer>
    <RouterView v-slot="{ Component, route }">
      <component :is="Component" :key="route.path" />
    </RouterView>
  </PageContainer>
</template>
