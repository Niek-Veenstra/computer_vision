<script setup lang="ts">
import NavChip from './NavChip.vue'
</script>
<template>
  <div
    class="bg-surface-100 pl-0 pr-0 pt-1 pb-1 w-1/6 grid grid-cols-1 grid-rows-5 rounded-(--p-card-border-radius) shadow-(--p-card-shadow)"
  >
    <Image width="100" class="bg-surface-100" src="./../public/logo.png"></Image>
    <ul class="flex flex-col w-full">
      <NavChip icon="pi pi-home" label="Home"></NavChip>
      <NavChip icon="pi pi-file" label="Documents"></NavChip>
      <NavChip icon="pi pi-file-export" label="Exporter"></NavChip>
    </ul>
    <div></div>
  </div>
</template>
