// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()

import fs from 'fs'
// import { MongoClient } from 'mongodb'

// import { MONGO_URI } from '../constants'
// import { Draw } from '../domain/draw'
import { Canvas } from '../domain/canvas'

// import { DrawModel } from '../models/draw'

async function saveAllCavasStates() {
  // const client = new MongoClient(MONGO_URI)

  // await client.connect()
  // const drawModel = new DrawModel(client.db())

  // const totalDraws = await drawModel.countAll()
  // const draws: Array<unknown> = []

  // console.log('Fetch draws', totalDraws)

  // const limit = 500
  // const totalFetches = Math.ceil(totalDraws / limit)
  // const promises = new Array(totalFetches).fill(null).map((_, index) => {
  //   return drawModel.get(limit, limit * index)
  // })
  // const draws = (await Promise.all(promises))
  //   .flat()
  //   .sort((a, b) => b.timestamp - a.timestamp)
  // fs.writeFileSync('result.txt', JSON.stringify(draws))
  // await client.close()

  const draws = JSON.parse(fs.readFileSync('result.txt', 'utf-8'))

  const canvas = new Canvas()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base64s = draws.map((draw: any, index: number) => {
    canvas.draw(draw)
    console.log('tobase64', +index)
    return canvas.toBase64().replace('data:image/png;base63,', '')
  })
  const promises = base64s.map(async (base64: string, index: number) => {
    const buffer = Buffer.from(base64, 'base64')
    return new Promise(resolve =>
      fs.writeFile(
        `./pngs/${index}.png`,
        buffer,
        { encoding: 'base64' },
        () => {
          console.log(index + ' saved!')
          resolve(true)
        }
      )
    )
  })

  await Promise.all(promises)
}

saveAllCavasStates()
