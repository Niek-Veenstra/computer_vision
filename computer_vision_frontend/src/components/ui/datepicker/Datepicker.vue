<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { DateFormatter, getLocalTimeZone, today } from '@internationalized/date'
import { CalendarIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
const df = new DateFormatter('en-US', {
  dateStyle: 'long',
})

const emits = defineEmits<{
  (e: 'update:modelValue', payload: DateValue | undefined): void
}>()
const props = defineProps<{
  modelValue: DateValue
}>()
</script>
<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :class="
          cn(
            'w-[280px] justify-start text-left font-normal',
            !props.modelValue && 'text-muted-foreground',
          )
        "
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        {{
          props.modelValue ? df.format(props.modelValue.toDate(getLocalTimeZone())) : 'Pick a date'
        }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0">
      <Calendar
        @update:model-value="(value) => emits('update:modelValue', value)"
        initial-focus
        :default-placeholder="today(getLocalTimeZone())"
        layout="month-and-year"
      />
    </PopoverContent>
  </Popover>
</template>
