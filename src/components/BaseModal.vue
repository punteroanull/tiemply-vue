<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

// Accessible dialog shell: labelled, closes on Escape and backdrop click, keeps Tab inside
// and hands focus back to whatever opened it.
const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    /** Blocks Escape / backdrop while a request is in flight. */
    busy?: boolean
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { busy: false, size: 'md' }
)

const emit = defineEmits<{ (e: 'close'): void }>()

const panel = ref<HTMLElement | null>(null)
const titleId = `modal-title-${Math.random().toString(36).slice(2, 9)}`
let opener: HTMLElement | null = null

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusables(): HTMLElement[] {
  return panel.value ? Array.from(panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)) : []
}

function close() {
  if (!props.busy) emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'Tab') return

  const items = focusables()
  if (items.length === 0) {
    event.preventDefault()
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || active === panel.value)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

function restoreFocus() {
  opener?.focus?.()
  opener = null
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      opener = document.activeElement as HTMLElement | null
      await nextTick()
      const target =
        panel.value?.querySelector<HTMLElement>('[autofocus]') ?? focusables()[0] ?? panel.value
      target?.focus()
    } else {
      restoreFocus()
    }
  },
  { immediate: true }
)

onBeforeUnmount(restoreFocus)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      @keydown="onKeydown"
    >
      <div class="absolute inset-0 bg-neutral-900/50" aria-hidden="true" @click="close"></div>
      <div
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        class="relative w-full bg-white shadow-xl rounded-t-lg sm:rounded-lg max-h-[90vh] overflow-y-auto focus:outline-none"
        :class="{
          'sm:max-w-sm': size === 'sm',
          'sm:max-w-md': size === 'md',
          'sm:max-w-lg': size === 'lg',
        }"
      >
        <div class="p-6">
          <h2 :id="titleId" class="text-lg font-semibold text-neutral-900">{{ title }}</h2>
          <div class="mt-4">
            <slot />
          </div>
          <div v-if="$slots.footer" class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
