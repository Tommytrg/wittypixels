import { defineStore } from 'pinia'
import { ApiService } from '@/api'
import router from '../router'
import {
  type Pixel,
  type PalettePoints,
  type PixelMap,
  type Errors,
  type InteractionInfo,
  ErrorKey,
  type BasicPixel,
  type ApiPixel,
} from '@/types'
import { useLocalStore } from './local'
export const useStore = defineStore('player', {
  state: () => {
    return {
      api: new ApiService(),
      localStore: useLocalStore(),
      id: null,
      username: '',
      score: null,
      color: 0 as number,
      bonus: null,
      interactionInfo: null,
      interactionIn: null as InteractionInfo | null,
      interactionOut: null as InteractionInfo | null,
      history: [],
      playersGlobalStats: [],
      errors: {} as Errors,
      selectedColor: null as string | null,
      palettePoints: {} as PalettePoints,
      showPalettePanel: false as boolean,
      pixelToPaint: null as Pixel | null,
      pixelMap: {} as PixelMap,
      checkpoint: 0,
      pixels: new Array(1000).fill(null).map((row, i) =>
        new Array(1000).fill(null).map(
          (col, j) =>
            ({
              x: i,
              y: j,
              fill: 'white',
              author: null,
              timestamp: null,
            } as BasicPixel)
        )
      ),
    }
  },
  actions: {
    async getPixelMap() {
      console.log('inside get pixelmap')
      const tokenInfo = this.localStore.getToken()
      const request = await this.api.getCanvas({
        checkpoint: this.checkpoint,
        token: tokenInfo.token,
      })
      console.log('request', request)
      if (request.error) {
        // TODO: set correct error
        // this.setError(ErrorKey.auth, request.error)
      } else {
        // normalize pixels from api to ui type
        const normalizedPixels: Array<Array<BasicPixel>> = request.pixels.map(
          (row: Array<ApiPixel>) => {
            return row.map(pixel => {
              return {
                x: pixel.x,
                y: pixel.y,
                fill: pixel.color,
                author: pixel.owner,
                // TODO: the api should return this value
                timestamp: Date.now(),
              }
            })
          }
        )
        this.pixels = normalizedPixels
      }
    },
    paintPixel() {
      if (
        this.pixelMap &&
        this.selectedColor &&
        this.pixelToPaint &&
        !this.pixelMap[this.pixelToPaint.id].author
      ) {
        this.pixelMap[this.pixelToPaint.id] = {
          ...this.pixelToPaint,
          author: this.username,
          timestamp: new Date().getTime(),
          stroke: this.pixelToPaint.fill,
        }
      }
    },
    setPixelToPaint(pixel: Pixel) {
      if (this.pixelMap && this.pixelMap[pixel.id].author) {
        if (this.pixelMap) {
          this.pixelToPaint = {
            ...this.pixelMap[pixel.id],
            stroke: pixel.stroke,
          }
        }
      } else {
        this.pixelToPaint = {
          ...pixel,
          stroke: pixel.stroke,
        }
      }
    },
    clearPixelToPaint() {
      this.pixelToPaint = null
      this.selectedColor = null
    },
    togglePalettePanel(value: boolean) {
      this.showPalettePanel = value
    },
    selectColor(color: string) {
      this.selectedColor = color
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
        // TODO: remove
        this.getPixelMap()
        console.log('[getPlayerInfo]: request ->', request)
        this.clearError(ErrorKey.info)
        const { key, username, score, color, palette } = request.player
        this.id = key
        this.username = username
        this.score = score
        this.palettePoints = palette
        // TODO: add ranking in the api reponse
        // this.ranking = ranking

        this.color = color
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
