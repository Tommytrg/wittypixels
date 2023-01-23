import {
  CANVAS_MAX_X,
  CANVAS_MAX_Y,
  INTERACTION_DURATION_MILLIS,
} from '../constants'
import {
  DbPlayerVTO,
  ExtendedPlayerVTO,
  PlayerLeaderboardInfo,
  Color,
  Palette,
  DbCanvasVTO,
  DbDrawVTO,
} from '../types'
import { Draw } from './draw'

export class Canvas {
  pixels: Array<
    Array<{
      x: number
      y: number
      color: number
      owner: string
    }>
  >

  constructor(vto?: DbCanvasVTO) {
    if (vto) {
      this.pixels = vto.pixels
    } else {
      this.pixels = new Array(CANVAS_MAX_X).fill(null).map((_row, xCoord) => {
        return new Array(CANVAS_MAX_Y).fill(null).map((_col, yCoord) => {
          return {
            x: xCoord,
            y: yCoord,
            color: Color.White,
            // TODO: Allow null
            owner: '',
          }
        })
      })
    }
  }

  draw(draw: DbDrawVTO): Draw {
    const now = Date.now()

    const { x, y, player, color } = draw

    this.pixels[x][y] = {
      ...this.pixels[x][y],
      color,
      owner: player,
    }

    return new Draw({
      color: draw.color,
      ends: now + INTERACTION_DURATION_MILLIS,
      x,
      y,
      player,
      timestamp: now,
    })
  }

  toDbVTO(): DbCanvasVTO {
    return {
      pixels: this.pixels,
    }
  }
}
