<script setup lang="ts">
import NavChip from './NavChip.vue'
import Card from './../components/Card.vue'

type NavChip = InstanceType<typeof NavChip>['$props']

const navChips: NavChip[] = [
  { icon: 'pi pi-home', label: 'Home', tooltip: 'Home', to: '/home' },
  { icon: 'pi pi-file', label: 'Documents', tooltip: 'Documents', to: '/documents' },
  { icon: 'pi pi-file-export', label: 'Exporter', tooltip: 'Exporter', to: '/exporter' },
]
</script>
<template>
  <Card class="grid grid-cols grid-rows-5">
    <Image width="100" src="./../public/logo.png"></Image>
    <ul class="flex flex-col w-full">
      <NavChip
        v-for="navchip in navChips"
        :tooltip="navchip.tooltip"
        :icon="navchip.icon"
        :label="navchip.label"
        :to="navchip.to"
      ></NavChip>
    </ul>
    <div class="row-start-5 row-end-6 pt-11">
      <NavChip icon="pi pi-cog" label="Settings" tooltip="Settings" to="/settings"></NavChip>
      <Divider></Divider>
      <div class="flex justify-center">
        <Avatar shape="circle" label="U" size="large" />
      </div>
    </div>
  </Card>
</template>
