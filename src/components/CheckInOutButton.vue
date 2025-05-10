<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  isCheckedIn: {
    type: Boolean,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['check-in', 'check-out'])

function handleClick() {
  if (props.isLoading) return
  
  if (props.isCheckedIn) {
    emit('check-out')
  } else {
    emit('check-in')
  }
}

const buttonClasses = computed(() => {
  if (props.isCheckedIn) {
    return 'bg-error hover:bg-red-600'
  } else {
    return 'bg-secondary-600 hover:bg-secondary-700'
  }
})

const buttonText = computed(() => {
  if (props.isLoading) {
    return props.isCheckedIn ? 'Checking out...' : 'Checking in...'
  } else {
    return props.isCheckedIn ? 'Check out' : 'Check in'
  }
})

const buttonIcon = computed(() => {
  if (props.isCheckedIn) {
    return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd" />
    </svg>`
  } else {
    return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clip-rule="evenodd" />
    </svg>`
  }
})
</script>

<template>
  <button 
    @click="handleClick"
    :class="[
      'text-white font-medium rounded-full shadow-lg flex items-center transition-all duration-300 transform hover:scale-105 focus:outline-none px-5 py-3',
      buttonClasses,
      { 'opacity-75 cursor-not-allowed': isLoading }
    ]"
  >
    <span v-if="isLoading" class="inline-block h-5 w-5 mr-2">
      <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </span>
    <span v-else v-html="buttonIcon"></span>
    {{ buttonText }}
  </button>
</template>