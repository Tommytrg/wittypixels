<template>
  <v-rect
    :ref="`${pixel.x}:${pixel.y}`"
    :key="`${pixel.x}:${pixel.y}`"
    :config="{
      x: pixel.x * PIXEL_SIZE,
      y: pixel.y * PIXEL_SIZE,
      fill: COLORS[pixel.c],
      height: PIXEL_SIZE,
      width: PIXEL_SIZE,
      strokeWidth: 1,
      stroke: pixel.c !== 0 ? COLORS[pixel.c] : '#8a8a8a3d',
    }"
  ></v-rect>
</template>

<script lang="ts">
import { PIXEL_SIZE, COLORS } from '@/constants'

export default {
  props: {
    pixel: {
      type: Object,
      required: true,
    },
  },
  setup() {
    return {
      PIXEL_SIZE,
      COLORS,
    }
  },
}
</script>
