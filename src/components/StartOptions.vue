<script setup lang="ts">
import AppIcon from './AppIcon.vue';

defineProps<{
  options: { id: string; name: string; desc?: string; icon?: string }[];
  selectedId?: string;
}>();
defineEmits<{ select: [id: string] }>();
</script>

<template>
  <div class="start-options">
    <button v-for="option in options" :key="option.id" class="start-option"
      :aria-label="option.name" :aria-pressed="option.id === selectedId" @click="$emit('select', option.id)">
      <span v-if="option.icon" class="squad-icon-frame">
        <img :src="option.icon" alt="" width="28" height="28" />
      </span>
      <span class="start-option-copy">
        <strong>{{ option.name }}</strong>
        <span v-if="option.desc">{{ option.desc }}</span>
      </span>
      <AppIcon v-if="option.id === selectedId" name="check" />
    </button>
  </div>
</template>
