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
  <div class="btn" v-if="gameStore.gameOver">
    <TransactionHash v-if="transactionInProgress" />
    <CustomButton
      v-if="web3WrongNetwork"
      @click="addNetwork()"
      type="dark"
      :slim="true"
    >
      Switch to {{ NETWORKS[CURRENT_NETWORK].name }}
    </CustomButton>
    <CustomButton
      v-else-if="!gameStore.redeemCountdownOver || fractionalizing"
      type="disable"
      :slim="true"
    >
      <p class="disabled-text">
        Allowing redeem
        <span v-if="!gameStore.redeemCountdownOver">
          in
          <TimeLeft
            v-if="!gameStore.redeemCountdownOver"
            class="time-left"
            :timestamp="gameStore.timeToRedeemInMilli"
            :seconds="true"
            @clear-timestamp="allowRedeem"
          />
        </span>
        ...
      </p>
    </CustomButton>
    <CustomButton
      v-else-if="txType"
      @click="gameOverAction"
      :type="web3Disconnected || transactionInProgress ? 'disable' : 'dark'"
      :slim="true"
    >
      {{ transactionInProgress ? txInProgressText : txActionText }}
    </CustomButton>
    <a v-else-if="transactionConfirmed" :href="marketplaceUrl">
      <CustomButton :type="web3Disconnected ? 'disable' : 'dark'" :slim="true">
        Check on {{ marketplaceName }}
      </CustomButton>
    </a>
  </div>
</template>

<script lang="ts">
import { useStore } from '@/stores/player'
import { useLocalStore } from '@/stores/local'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modal'
import {
  ModalKey,
  TxType,
  GameOverStatus,
  InteractionType,
  TokenStatus,
} from '@/types'
import { useWeb3 } from '@/composables/useWeb3'
import {
  POLLER_MILLISECONDS,
  NETWORKS,
  CURRENT_NETWORK,
  ERC721_ADDRESS,
  ERC721_TOKEN_ID,
} from '@/constants.js'
import { onMounted, onBeforeUnmount, computed, watch } from 'vue'
export default {
  setup(_props) {
    let tokenStatusPoller: any
    let txConfirmationStatusPoller: any

    const player = useStore()
    const localStore = useLocalStore()
    const modalStore = useModalStore()
    const gameStore = useGameStore()
    const web3WittyPixels = useWeb3()

    const actionText: Record<TxType, string> = {
      [TxType.Redeem]: 'Redeem ownership',
      [TxType.Buy]: 'Buy NFT',
      [TxType.Withdraw]: 'Withdraw',
    }

    const inProgressText: Record<TxType, string> = {
      [TxType.Redeem]: 'Redeeming...',
      [TxType.Buy]: 'Buying...',
      [TxType.Withdraw]: 'Withdrawing...',
    }

    const gameOver = computed(() => gameStore.gameOver)
    const gameOverStatus = computed(() => gameStore.gameOverStatus)
    // const tokenStatus = computed(() => gameStore.tokenStatus)
    const type = computed(() => (player.interactionOut ? 'disable' : 'dark'))
    const transactionError = computed(() => gameStore.errors.transaction)
    const transactionInProgress = computed(
      () =>
        localStore.txInfo?.txHash &&
        !transactionConfirmed.value &&
        !transactionError.value
    )
    const transactionConfirmed = computed(
      () =>
        localStore.txInfo?.txConfirmation ||
        localStore.txInfo?.externalConfirmation
    )
    const redeemCountdownOver = computed(() => gameStore.redeemCountdownOver)
    const web3Disconnected = computed(() => gameStore.errors.web3Disconnected)
    const web3WrongNetwork = computed(() => gameStore.errors.web3WrongNetwork)
    const txType = computed(() => localStore.txInfo?.txType)
    const txActionText = computed(() =>
      txType.value ? actionText[txType.value] : ''
    )
    const txInProgressText = computed(() =>
      txType.value ? inProgressText[txType.value] : ''
    )
    const marketplaceUrl = computed(
      () =>
        `${NETWORKS[CURRENT_NETWORK].marketplace}/${ERC721_ADDRESS}/${ERC721_TOKEN_ID}`
    )
    const marketplaceName = computed(() => NETWORKS[CURRENT_NETWORK])
    const fractionalizing = computed(() => {
      return (
        !gameStore.gameOverStatus ||
        gameStore.gameOverStatus == GameOverStatus.Fractionalizing ||
        gameStore.tokenStatus == TokenStatus.Minting
      )
    })

    onBeforeUnmount(() => {
      clearPollers()
    })
    onMounted(async () => {
      await player.getPlayerInfo()
      if (redeemCountdownOver.value) {
        startTokenStatusPoller()
      } else if (gameOver.value) {
        modalStore.openModal(ModalKey.gameOver)
      }
    })

    watch(web3Disconnected, value => {
      if (value) {
        clearPollers()
      } else if (redeemCountdownOver.value) {
        startTokenStatusPoller()
      }
    })

    watch(web3WrongNetwork, value => {
      if (value) {
        clearPollers()
      } else if (redeemCountdownOver.value) {
        startTokenStatusPoller()
      }
    })

    watch(gameOverStatus, value => {
      if (value == GameOverStatus.AllowRedeem) {
        modalStore.openModal(ModalKey.redeem)
        localStore.saveTxInfo({ txType: TxType.Redeem })
      } else if (value == GameOverStatus.AllowSale) {
        localStore.saveTxInfo({ txType: TxType.Buy })
      } else if (value == GameOverStatus.AllowWithdraw) {
        localStore.saveTxInfo({ txType: TxType.Withdraw })
      }
    })

    watch(transactionConfirmed, value => {
      if (value) {
        modalStore.openModal(ModalKey.txConfirmation)
      }
    })

    watch(transactionError, value => {
      if (value) {
        modalStore.openModal(ModalKey.txError)
      }
    })

    watch(gameOver, value => {
      if (value) {
        modalStore.openModal(ModalKey.gameOver)
      }
    })

    watch(redeemCountdownOver, value => {
      if (value) {
        startTokenStatusPoller()
      }
    })

    async function startTokenStatusPoller() {
      await web3WittyPixels.enableProvider()
      if (
        !tokenStatusPoller &&
        !web3Disconnected.value &&
        !web3WrongNetwork.value
      ) {
        // start polling when provider is the correct one
        tokenStatusPoller = await setInterval(async () => {
          await web3WittyPixels.checkTokenStatus()
        }, POLLER_MILLISECONDS)
      }
    }

    const clearTimestamp = (interactionType: InteractionType) => {
      player[interactionType] = null
    }
    function allowRedeem() {
      gameStore.redeemCountdownOver = true
    }
    function addNetwork() {
      web3WittyPixels.addNetwork()
    }
    function clearPollers() {
      clearInterval(tokenStatusPoller)
      clearInterval(txConfirmationStatusPoller)
      tokenStatusPoller = null
      txConfirmationStatusPoller = null
    }
    function gameOverAction() {
      if (txType.value == TxType.Redeem) {
        web3WittyPixels.redeemOwnership()
      } else if (txType.value == TxType.Buy) {
        web3WittyPixels.buyNFT()
      } else if (txType.value == TxType.Withdraw) {
        web3WittyPixels.withdrawNFTOwnership()
      }
    }
    return {
      gameOverAction,
      player,
      type,
      clearTimestamp,
      addNetwork,
      allowRedeem,
      gameStore,
      web3Disconnected,
      web3WrongNetwork,
      InteractionType,
      NETWORKS,
      CURRENT_NETWORK,
      transactionConfirmed,
      transactionInProgress,
      txType,
      txActionText,
      txInProgressText,
      marketplaceUrl,
      marketplaceName,
      fractionalizing,
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
.add-polygon {
  width: max-content;
  color: $white;
  cursor: pointer;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: var(--secondary-color);
  display: flex;
  .metamask {
    margin-right: 4px;
    width: 16px;
  }
}
</style>
