import { COLORS } from '@/constants'
import { computed } from 'vue'
import { useStore } from '@/stores/player'

export function getColor() {
  const playerColor = computed(() => useStore().color)
  const color = computed(() => COLORS[playerColor.value])

  return color
}