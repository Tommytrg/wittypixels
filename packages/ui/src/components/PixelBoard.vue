<template>
  <div class="pixel-board" ref="targetBoard">
    <LoadingSpinner v-if="!pixelList.length" />
    <v-stage
      ref="stage"
      :config="configKonva"
      @wheel="zoom"
      @dragStart="changeDragCursor"
    >
      <v-layer ref="layer">
        <!-- What is :active for? -->
        <v-rect
          v-for="pixel in pixelList"
          :active="false"
          :ref="pixel.id"
          :key="pixel.id"
          :config="pixel"
          @click="previewPixelAndShowPanel({ x: pixel.x, y: pixel.y })"
          @tap="previewPixelAndShowPanel({ x: pixel.x, y: pixel.y })"
        ></v-rect>
        <v-rect
          v-if="pixelToPaint && authorizedPlayer"
          :config="pixelToPaint"
          @click="showPanel()"
        ></v-rect>
      </v-layer>
    </v-stage>
  </div>
</template>

<script lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { standardizePixelCoordinates } from '@/utils'
import { useStore } from '@/stores/player'
import type { Pixel, Coordinates, GeneratePixelArgs, PixelDB } from '@/types'
import { PIXEL_SIZE, SCALE_BY, COLORS, POLLER_MILLISECONDS } from '@/constants'

export default {
  setup() {
    // TODO: use conva cache: https://konvajs.org/docs/vue/Cache.html

    console.log('1')
    const store = useStore()
    let pixelMapPoller: any = null
    const stage = ref()
    const layer = ref()
    const targetBoard = ref()
    let configKonva = ref({})
    onMounted(async () => {
      console.log(2)
      configKonva.value = {
        width: targetBoard.value.clientWidth,
        height: targetBoard.value.clientHeight,
        draggable: true,
      }
    })
    onMounted(() => {
      console.log(3)
      pixelMapPoller = setInterval(async () => {
        await store.getPixelMap()
      }, POLLER_MILLISECONDS)
    })
    onBeforeUnmount(() => {
      console.log(4)
      clearInterval(pixelMapPoller)
    })
    const selectedColor = computed(() => {
      console.log(5)
      return store.selectedColor
    })
    const pixelToPaint = computed(() => {
      console.log(6)
      return store.pixelToPaint
    })
    const stageNode = computed(() => {
      console.log(7)
      return stage.value.getNode()
    })
    const stageContainer = computed(() => {
      console.log(8)
      return stage.value.getStage().container()
    })
    const authorizedPlayer = computed(() => {
      console.log(9)
      return store.username
    })
    const pixelList = computed(() => {
      console.log(10)
      return store.pixelMap?.flatMap((pixels: Array<PixelDB>) => {
        console.log(11)
        return pixels.map((pixel: PixelDB) => {
          console.log(12)
          // Scale pixel size to improve pixel visibility
          return generatePixel({
            x: pixel.x * PIXEL_SIZE,
            y: pixel.y * PIXEL_SIZE,
            color: COLORS[pixel.c],
            strokeColor: pixel.c !== 0 ? COLORS[pixel.c] : '#8a8a8a3d',
          })
        })
      })
    })
    function generateId({ x, y }: Coordinates): string {
      console.log(13)
      return `${x}:${y}`
    }
    function generatePixel({
      x,
      y,
      color,
      strokeColor = color,
    }: GeneratePixelArgs): Pixel {
      console.log(14)
      return {
        id: generateId({ x: x, y: y }),
        author: null,
        timestamp: null,
        x: x,
        y: y,
        width: PIXEL_SIZE,
        height: PIXEL_SIZE,
        fill: color,
        strokeWidth: 1,
        stroke: strokeColor,
      }
    }
    function showPanel() {
      console.log(15)
      store.togglePalettePanel(true)
    }
    function previewPixelAndShowPanel({ x, y }: Coordinates) {
      console.log(16)
      if (authorizedPlayer.value) {
        showPanel()
        previewPixel({ x, y })
      }
    }
    function previewPixel({ x, y }: Coordinates) {
      console.log(17)
      if (
        !pixelToPaint.value ||
        generateId({ x: pixelToPaint.value.x, y: pixelToPaint.value.y }) !==
          generateId({ x, y })
      ) {
        console.log('17.1')
        store.setPixelToPaint(
          generatePixel({
            x,
            y,
            color: selectedColor.value ?? 'white',
            strokeColor: 'black',
          })
        )
      }
      stageContainer.value.style.cursor = 'pointer'
    }
    function isActive(pixel: Pixel) {
      console.log(18)
      return (
        pixel.fill ===
        COLORS[
          store.pixelMap[standardizePixelCoordinates(pixel.x)][
            standardizePixelCoordinates(pixel.y)
          ]?.c
        ]
      )
    }
    function clearPixelToPaint() {
      console.log(19)
      store.clearPixelToPaint()
      store.togglePalettePanel(false)
    }
    function changeDragCursor() {
      console.log(20)
      stageContainer.value.style.cursor = 'move'
    }
    function zoom(e: any) {
      console.log(21)
      e.evt.preventDefault()
      // Scale
      let direction = e.evt.deltaY > 0 ? 1 : -1
      const pointerPosition = stageNode.value.getPointerPosition()
      const prevScale = stageNode.value.scaleX()
      const nextScale =
        direction > 0 ? prevScale * SCALE_BY : prevScale / SCALE_BY
      const mousePointTo = {
        x: (pointerPosition.x - stageNode.value.x()) / prevScale,
        y: (pointerPosition.y - stageNode.value.y()) / prevScale,
      }
      const newPos = {
        x: pointerPosition.x - mousePointTo.x * nextScale,
        y: pointerPosition.y - mousePointTo.y * nextScale,
      }
      // Zoom on trackpad
      if (e.evt.ctrlKey) direction = -direction
      stageNode.value.scale({ x: nextScale, y: nextScale })
      stageNode.value.position(newPos)
      stageNode.value.batchDraw()
    }
    return {
      configKonva,
      previewPixel,
      pixelToPaint,
      stage,
      zoom,
      changeDragCursor,
      clearPixelToPaint,
      targetBoard,
      previewPixelAndShowPanel,
      showPanel,
      pixelList,
      isActive,
      generatePixel,
      authorizedPlayer,
      layer,
    }
  },
}
</script>
<style>
.pixel-board {
  max-width: 100%;
  height: 100%;
  max-height: 90vh;
  overflow: hidden;
}
</style>
