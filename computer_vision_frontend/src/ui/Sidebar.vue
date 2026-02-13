<script setup lang="ts">
const chipStyling = ref({
  color: '{text.muted.color}',
  icon: {
    color: '{text.muted.color}',
  },
})
</script>
<template>
  <div
    class="bg-surface-100 pl-0 pr-0 pt-1 pb-1 w-1/6 rounded-(--p-card-border-radius) shadow-(--p-card-shadow)"
  >
    <Image width="100" class="bg-primary" src="./../public/logo.png"></Image>
    <ul class="flex flex-col w-full">
      <Chip :dt="chipStyling" icon="pi pi-home" label="Home"></Chip>
      <Chip :dt="chipStyling" icon="pi pi-home" label="Home"></Chip>
      <Chip :dt="chipStyling" icon="pi pi-home" label="Home"></Chip>
      <Chip :dt="chipStyling" icon="pi pi-home" label="Home"></Chip>
    </ul>
  </div>
</template>
