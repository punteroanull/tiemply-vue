<script setup lang="ts">
</script>

<template>
  <div
    class="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-4"
  >
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-semibold text-primary-600">Tiemply</h1>
        <p class="text-neutral-600 mt-2">Employee Time Management System</p>
      </div>

      <div class="bg-white shadow-subtle rounded-lg p-8">
        <router-view />
      </div>
    </div>
  </div>
</template>
