import fs from 'fs'
import GIFEncoder from 'gifencoder'
import { createCanvas, loadImage } from 'canvas'

function createGif() {
  const width = 250
  const height = 250

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  const encoder = new GIFEncoder(width, height)
  encoder.createReadStream().pipe(fs.createWriteStream('./wittypixels_10.gif'))
  encoder.start()
  encoder.setRepeat(0)
  encoder.setDelay(1)
  encoder.setQuality(10)

  const images = fs
    .readdirSync('./pngs/')
    .sort(
      (a, b) => Number(a.replace('.png', '')) - Number(b.replace('.png', ''))
    )
  images
    .filter((_, index) => index % 200 === 0)
    .forEach(async (img: string, index: number) => {
      const image = await loadImage(`./pngs/${img}`)
      console.log('index', index)
      ctx.drawImage(
        image,
        0,
        0,
        image.width,
        image.height,
        0,
        0,
        canvas.width,
        canvas.height
      )
      encoder.addFrame(ctx)
      if (index === images.length - 1) {
        encoder.finish()
      }
    })
}

createGif()
