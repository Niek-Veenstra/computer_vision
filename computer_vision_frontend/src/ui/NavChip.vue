<script setup lang="ts">
const props = defineProps({
  icon: String,
  label: String,
})
</script>
<template>
  <div
    class="hover:pointer text-muted-color hover:text-color pl-6 text-xl justify-center items-center space-x-3"
  >
    <i :class="`justify-self-start pi ${props.icon} `"></i>
    <span>·</span>
    <span>{{ props.label }}</span>
  </div>
</template>
