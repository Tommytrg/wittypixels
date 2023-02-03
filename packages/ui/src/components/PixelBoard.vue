<template>
  <div class="pixel-board" ref="targetBoard">
    <LoadingSpinner v-if="!pixelMap[0]?.length" />

    -- {{ pixelToPaint }} --

    <v-stage
      ref="stage"
      :config="configKonva"
      @wheel="zoom"
      @dragStart="changeDragCursor"
    >
      <v-layer ref="layer">
        <!-- What is :active for? -->
        <!-- id: generateId({ x: x, y: y }),
        author: null,
        timestamp: null,
        x: x,
        y: y,
        width: PIXEL_SIZE,
        height: PIXEL_SIZE,
        fill: color,
        strokeWidth: 1,
        stroke: strokeColor, -->
        <v-rect
          v-for="pixel in pixelMap.flat()"
          :ref="`${pixel.x}:${pixel.y}`"
          :key="`${pixel.x}:${pixel.y}`"
          :config="{
            x: pixel.x * PIXEL_SIZE,
            y: pixel.y * PIXEL_SIZE,
            fill: COLORS[pixel.c],
            height: PIXEL_SIZE,
            width: PIXEL_SIZE,
            strokeWidth: 1,
            stroke: pixel.c !== 0 ? COLORS[pixel.c] : '#8a8a8a3d',
          }"
          @click="previewPixelAndShowPanel({ x: pixel.x, y: pixel.y })"
          @tap="previewPixelAndShowPanel({ x: pixel.x, y: pixel.y })"
        ></v-rect>
        <v-rect
          v-if="pixelToPaint && authorizedPlayer"
          :config="{
            ...pixelToPaint,
            x: pixelToPaint.x * PIXEL_SIZE,
            y: pixelToPaint.y * PIXEL_SIZE,
          }"
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
    const store = useStore()
    let pixelMapPoller: any = null
    const stage = ref()
    const layer = ref()
    const targetBoard = ref()
    let configKonva = ref({})
    onMounted(async () => {
      configKonva.value = {
        width: targetBoard.value.clientWidth,
        height: targetBoard.value.clientHeight,
        draggable: true,
      }
    })
    onMounted(() => {
      pixelMapPoller = setInterval(async () => {
        await store.getPixelMap()
      }, POLLER_MILLISECONDS)
    })
    onBeforeUnmount(() => {
      clearInterval(pixelMapPoller)
    })
    const selectedColor = computed(() => {
      return store.selectedColor
    })
    const pixelToPaint = computed(() => {
      return store.pixelToPaint
    })
    const stageNode = computed(() => {
      return stage.value.getNode()
    })
    const stageContainer = computed(() => {
      return stage.value.getStage().container()
    })
    const authorizedPlayer = computed(() => {
      return store.username
    })
    // const pixelList = computed(() => {
    //   console.log(10, store.pixelMap)
    //   return store.pixelMap?.flatMap((pixels: Array<PixelDB>) => {
    //     console.log(11)
    //     return pixels.map((pixel: PixelDB) => {
    //       console.log(12)
    //       // Scale pixel size to improve pixel visibility
    //       return generatePixel({
    //         x: pixel.x * PIXEL_SIZE,
    //         y: pixel.y * PIXEL_SIZE,
    //         color: COLORS[pixel.c],
    //         strokeColor: pixel.c !== 0 ? COLORS[pixel.c] : '#8a8a8a3d',
    //       })
    //     })
    //   })
    // })
    const pixelMap = computed(() => {
      return store.pixelMap
    })
    function generateId({ x, y }: Coordinates): string {
      return `${x}:${y}`
    }
    function generatePixel({
      x,
      y,
      color,
      strokeColor = color,
    }: GeneratePixelArgs): Pixel {
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
      store.togglePalettePanel(true)
    }
    function previewPixelAndShowPanel({ x, y }: Coordinates) {
      if (authorizedPlayer.value) {
        showPanel()
        previewPixel({ x, y })
      }
    }
    function previewPixel({ x, y }: Coordinates) {
      if (
        !pixelToPaint.value ||
        generateId({ x: pixelToPaint.value.x, y: pixelToPaint.value.y }) !==
          generateId({ x, y })
      ) {
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
      store.clearPixelToPaint()
      store.togglePalettePanel(false)
    }
    function changeDragCursor() {
      stageContainer.value.style.cursor = 'move'
    }
    function zoom(e: any) {
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
      pixelMap,
      isActive,
      generatePixel,
      authorizedPlayer,
      layer,
      COLORS,
      PIXEL_SIZE,
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
