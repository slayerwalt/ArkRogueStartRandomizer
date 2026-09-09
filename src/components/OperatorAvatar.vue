<script setup lang="ts">
import { computed, ref } from 'vue';
import { operatorAvatarUrl } from '../lib/constants';
const props = defineProps<{ id: string; name: string; lazy?: boolean }>();
const broken = ref(new Set<string>());
const src = computed(() =>
  broken.value.has(props.id) ? undefined : operatorAvatarUrl(props.id),
);
</script>
<template>
  <span class="avatar-frame">
    <img
      v-if="src"
      :src="src"
      alt=""
      :loading="lazy ? 'lazy' : 'eager'"
      width="128"
      height="128"
      @error="broken.add(id)"
    />
    <span v-else class="avatar-fallback" aria-hidden="true">
      {{ name.slice(0, 1) }}
    </span>
  </span>
</template>
