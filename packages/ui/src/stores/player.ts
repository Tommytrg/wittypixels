import { defineStore } from 'pinia'
import { ApiService } from '@/api'
import router from '../router'
import {
  type PalettePoints,
  type PixelDB,
  type Errors,
  type InteractionInfo,
  ErrorKey,
} from '@/types'
import { useLocalStore } from './local'
export const useStore = defineStore('player', {
  state: () => {
    return {
      api: new ApiService(),
      localStore: useLocalStore(),
      id: null,
      creationIndex: null as number | null,
      username: '',
      score: null,
      color: 7 as number,
      bonus: null,
      interactionInfo: null,
      interactionIn: null as InteractionInfo | null,
      interactionOut: null as InteractionInfo | null,
      history: [],
      playersGlobalStats: [],
      errors: {} as Errors,
      selectedColor: null as number | null,
      palettePoints: {} as PalettePoints,
      showPalettePanel: false as boolean,
      pixelToPaint: null as PixelDB | null,
      pixelMap: [] as Array<Array<PixelDB>>,
      checkpoint: 0,
    }
  },
  actions: {
    async getPixelMap() {
      const request = await this.api.getCanvas({
        checkpoint: this.checkpoint,
      })
      if (request.error) {
        this.setError(ErrorKey.canvas, request.error)
      } else {
        if (request?.canvas?.pixels) {
          this.pixelMap = request.canvas.pixels
          console.log('holaaa request get pixelmap', this.pixelMap)
          // Avoid reassign pixels in property to avoid computed property to recompute
        }
        if (request?.canvas?.diff) {
          const diff = request.canvas.diff
          if (diff.lenght) {
            this.$patch(() => {
              // TODO: remove repeated
              diff.forEach((pixel: PixelDB) => {
                this.pixelMap[pixel.x][pixel.y] = pixel
              })
            })
          }
        }
        this.checkpoint = request.checkpoint
        this.clearError(ErrorKey.canvas)
      }
    },
    async paintPixel() {
      if (this.pixelToPaint && this.selectedColor) {
        const tokenInfo = this.localStore.getToken()
        console.log('paint pixel in x', this.pixelToPaint.x)
        console.log('paint pixel in y', this.pixelToPaint.y)
        const request = await this.api.drawPixel({
          x: this.pixelToPaint.x,
          y: this.pixelToPaint.y,
          color: this.selectedColor ? this.selectedColor : this.pixelToPaint.c,
          token: tokenInfo.token,
        })
        if (request.error) {
          this.setError(ErrorKey.paint, request.error)
        } else {
          this.pixelMap[request.x][request.y] = request
          console.log('pixel painted!!', this.pixelMap[request.x][request.y])
          this.clearError(ErrorKey.paint)
        }
      }
    },
    setPixelToPaint(pixel: PixelDB) {
      const pixelFromMap = this.pixelMap[pixel.x]
        ? this.pixelMap[pixel.x][pixel.y]
        : null
      if (this.pixelMap && pixelFromMap?.o) {
        this.pixelToPaint = pixelFromMap
      } else {
        this.pixelToPaint = pixel
      }
    },
    clearPixelToPaint() {
      this.pixelToPaint = null
      this.selectedColor = null
    },
    togglePalettePanel(value: boolean) {
      this.showPalettePanel = value
    },
    selectColor(color: number) {
      this.selectedColor = color
      if (this.pixelToPaint) {
        this.pixelToPaint.c = color
      }
    },
    notify(payload: any) {
      const app = (this as any).app
      app.config.globalProperties.$notify(payload)
    },
    // TODO: set NFT preview data
    setPreviewData(preview: any) {
      console.log(preview)
    },
    // Errors
    clearError(error: ErrorKey) {
      this.errors[error] = null
    },
    setError(name: ErrorKey, error: any) {
      this.errors[name] = error.response?.data?.message || error.toString()
      this.notify({ message: this.errors[name] })
    },

    async authorize({ key }: any) {
      const request = await this.api.authorize({ key })
      if (request.error) {
        router.push('/init-game')
        this.setError(ErrorKey.auth, request.error)
      } else if (request.token) {
        await this.localStore.saveTokenInfo(request)
        this.clearError(ErrorKey.auth)
        await this.getPlayerInfo()
        await this.getGlobalStats()
        router.push(`/settings/${key}`)
      }
    },
    async interact({ key }: any) {
      const tokenInfo = this.localStore.getToken()
      const request = await this.api.interact({
        token: tokenInfo.token,
        to: key,
      })

      if (request.error) {
        this.setError(ErrorKey.interaction, request.error)
        router.push('/init-game')
      } else {
        this.clearError(ErrorKey.interaction)
        this.interactionInfo = request
        router.push('/init-game')
        this.getPlayerInfo()
      }
    },
    // History
    async getInteractionHistory(offset = 0, limit = 25) {
      const tokenInfo = this.localStore.getToken()
      const request = await this.api.getInteractionHistory({
        token: tokenInfo && tokenInfo.token,
        id: tokenInfo && tokenInfo.key,
        offset,
        limit,
      })
      if (request.error) {
        router.push('/init-game')
        this.setError(ErrorKey.history, request.error)
      } else {
        this.clearError(ErrorKey.history)
        return {
          result: request.interactions?.interactions,
          total: request.interactions?.total,
        }
      }
    },
    // Leaderboard
    async getGlobalStats(offset = 0, limit = 25) {
      await this.getPlayerInfo()
      const request = await this.api.getLeaderboardInfo({
        offset,
        limit,
      })
      if (request.error) {
        this.setError(ErrorKey.getLeaderboardInfo, request.error)
      } else {
        this.clearError(ErrorKey.getLeaderboardInfo)
        return {
          result: request.players.players,
          total: request.players.total,
        }
      }
    },
    // Player Info
    async getPlayerInfo() {
      const tokenInfo = this.localStore.getToken()
      const request = await this.api.getInfo({
        token: tokenInfo && tokenInfo.token,
        id: tokenInfo && tokenInfo.key,
      })
      if (request.error) {
        router.push({ name: 'init-game' })
        this.setError(ErrorKey.info, request.error)
      } else {
        this.clearError(ErrorKey.info)
        const { key, username, score, color, palette, creationIndex } =
          request.player
        this.id = key
        this.username = username
        this.score = score
        this.palettePoints = palette
        this.color = color
        this.creationIndex = creationIndex
        if (request.lastInteractionIn) {
          this.interactionIn = request.lastInteractionIn
        }
        if (request.lastInteractionOut) {
          this.interactionOut = request.lastInteractionOut
        }
      }
    },
  },
})
