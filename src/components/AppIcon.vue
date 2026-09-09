<script setup lang="ts">
defineProps<{
  name:
    | 'shuffle'
    | 'arrow'
    | 'sliders'
    | 'close'
    | 'check'
    | 'chevron'
    | 'grid'
    | 'help'
    | 'search';
}>();
const paths = {
  shuffle:
    'm18 3 3 3-3 3M18 15l3 3-3 3M3 6h3c5 0 7 12 12 12h3M3 18h3c2 0 3.5-2 5-5M13 9c1.5-2 3-3 5-3h3',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  sliders: 'M4 7h9m4 0h3M4 17h3m4 0h9M13 4v6M7 14v6',
  close: 'm6 6 12 12M6 18 18 6',
  check: 'm5 12 4 4L19 6',
  chevron: 'm9 5 7 7-7 7',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  help: 'M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3v.1',
  search: 'm16 16 5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
};
</script>
<template>
  <svg
    class="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name]" />
  </svg>
</template>
