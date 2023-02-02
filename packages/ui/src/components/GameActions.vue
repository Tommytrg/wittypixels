<template>
  <div v-if="!gameStore.gameOver" class="button-container">
    <router-link class="btn" :to="type === 'disable' ? '' : '/scan'">
      <CustomButton :type="type" :slim="true">
        <p v-if="type == 'dark'">Scan</p>
        <p class="disabled-text" v-else>
          Allow new scan in
          <TimeLeft
            v-if="player.interactionOut?.ends"
            class="time-left"
            :timestamp="player.interactionOut?.ends"
            :seconds="true"
            @clear-timestamp="clearTimestamp(InteractionType.interactionOut)"
          />
        </p>
      </CustomButton>
    </router-link>
  </div>
  <GameOverActions v-if="gameStore.gameOver" />
</template>

<script lang="ts">
import { useStore } from '@/stores/player'
import { useGameStore } from '@/stores/game'
import { InteractionType } from '@/types'
import { onMounted, computed } from 'vue'
export default {
  setup(_props) {
    const player = useStore()
    const gameStore = useGameStore()
    const type = computed(() => (player.interactionOut ? 'disable' : 'dark'))
    onMounted(async () => {
      await player.getPlayerInfo()
    })

    const clearTimestamp = (interactionType: InteractionType) => {
      player[interactionType] = null
    }
    return {
      player,
      type,
      clearTimestamp,
      InteractionType,
      gameStore,
    }
  },
}
</script>

<style lang="scss" scoped>
.btn {
  width: 100%;
}
.disabled-text {
  font-size: 18px;
}
</style>
