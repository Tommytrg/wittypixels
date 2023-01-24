import {
  CANVAS_MAX_X,
  CANVAS_MAX_Y,
  CANVAS_SECTOR_SIZE,
  INTERACTION_DURATION_MILLIS,
} from '../constants'
import {
  // DbPlayerVTO,
  // ExtendedPlayerVTO,
  // PlayerLeaderboardInfo,
  Color,
  // Palette,
  CanvasVTO,
  DbDrawVTO,
  DbSectorVTO,
} from '../types'
import { Draw } from './draw'

export class Canvas {
  pixels: Array<
    Array<{
      // we are using only the first letter to reduce the response size
      // color
      c: number
      // owner
      o: string
      // coord x
      x: number
      // coord y
      y: number
    }>
  >

  constructor(vto?: CanvasVTO) {
    if (vto) {
      this.pixels = vto.pixels
    } else {
      this.pixels = new Array(CANVAS_MAX_X).fill(null).map((_row, xCoord) => {
        return new Array(CANVAS_MAX_Y).fill(null).map((_col, yCoord) => {
          return {
            x: xCoord,
            y: yCoord,
            c: Color.White,
            o: '',
          }
        })
      })
    }
  }

  draw(draw: Omit<DbDrawVTO, 'ends' | 'timestamp'>): Draw {
    const now = Date.now()

    const { x, y, player, color } = draw

    this.pixels[x][y] = {
      ...this.pixels[x][y],
      c: color,
      o: player,
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

  toVTO(): CanvasVTO {
    return {
      pixels: this.pixels,
    }
  }

  toDbSectors(): Array<DbSectorVTO> {
    const sectorsPerRow = getSectorsPerRow(CANVAS_MAX_X, CANVAS_SECTOR_SIZE)
    const sectorsPerColumn = getSectorsPerRow(CANVAS_MAX_Y, CANVAS_SECTOR_SIZE)

    const totalSectors = sectorsPerRow * sectorsPerColumn
    const sectors: Record<string, DbSectorVTO> = new Array(totalSectors)
      .fill(null)
      .map((_, sectorIndex) => {
        const x = sectorIndex % sectorsPerRow
        const y = Math.floor(sectorIndex / sectorsPerRow)

        return sectorFactory(`${x}-${y}`)
      })
      // convert array to map by name
      .reduce((sectors, sector) => ({ ...sectors, [sector.name]: sector }), {})

    for (let y = 0; y < this.pixels.length; y++) {
      for (let x = 0; x < this.pixels[0].length; x++) {
        const pixel = this.pixels[y][x]
        const sectorX = Math.floor(x / CANVAS_SECTOR_SIZE)
        const sectorY = Math.floor(y / CANVAS_SECTOR_SIZE)
        const name = `${sectorX}-${sectorY}`
        sectors[name][y % CANVAS_SECTOR_SIZE][x % CANVAS_SECTOR_SIZE] = pixel
      }
    }

    // return new Array(totalSectors)
    //   .fill(null)
    //   .map((_, sectorIndex) => {
    //     const x = sectorIndex % CANVAS_MAX_X
    //     const y = Math.floor(sectorIndex / CANVAS_MAX_X)

    //     return sectors[`${x}-${y}`]
    //   })

    return Object.values(sectors)
  }

  // toDbVTO(): DbCanvasVTO {
  //   const sectorSize = 50
  //   const MAX_X = 600
  //   const MAX_Y = 700
  //   const sectorsPerRow = getSectorsPerRow(MAX_X, sectorSize)
  //   const sectorsPerColumn = getSectorsPerRow(MAX_Y, sectorSize)
  //   const totalSectors = sectorsPerRow * sectorsPerColumn
  //   const sectors = new Array(totalSectors).fill(null).map((_, sectorIndex) => {
  //     return new Array(sectorSize).fill(null).reduce(
  //       (acc, item, rowIndex) => {
  //         const x = sectorsPerRow % sectorIndex
  //         return {
  //           ...acc,
  //           [rowIndex]: new Array(sectorSize).fill(null).map((_, colIndex) => {
  //             const y = sectorsPerColumn % colIndex
  //             return {
  //               color: Color.White,
  //               owner: '',
  //               x,
  //               y,
  //             } as Pixel
  //           }),
  //         }
  //       },
  //       {
  //         name: sectorIndex,
  //       }
  //     )
  //   })
  //   return Promise.all(
  //     sectors.map(async sector => await this.repository.create(sector))
  //   )
  // }
}

export function getSectorsPerRow(maxX: number, sectorSize: number) {
  return Math.ceil(maxX / sectorSize)
}

function sectorFactory(name: string): DbSectorVTO {
  const sector: Record<string, unknown> = {}

  for (let i = 0; i < CANVAS_SECTOR_SIZE; i++) {
    sector[i] = []
  }
  sector.name = name

  return sector
}
