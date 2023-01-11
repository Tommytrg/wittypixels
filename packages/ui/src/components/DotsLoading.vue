<template>
  <div class="base-dots-loading" :style="{ margin }">
    <div
      v-for="className in ['first', 'second', 'third']"
      :key="className"
      class="dot"
      :class="[className]"
      :style="{
        width: size,
        height: size,
        ['background-color']: color,
      }"
    />
  </div>
</template>

<script>
export default {
  props: {
    /**
     * Width and height of each dot
     */
    size: {
      type: String,
      default: '4px',
    },
    margin: {
      type: String,
      default: '8px 8px 0 4px',
    },
    color: {
      type: String,
      default: 'black',
    },
  },
}
</script>

<style lang="scss">
/* Thanks to @tobiasahlin at http://tobiasahlin.com/spinkit/ */
.base-dots-loading {
  align-items: center;
  position: inline-block;
  display: flex;

  .dot {
    animation: sk-bouncedelay 1.4s infinite ease-in-out both;
    border-radius: 100%;
    display: inline-block;
    height: 4px;
    margin-right: 1px;
    width: 4px;

    &.first {
      animation-delay: -0.32s;
    }

    &.second {
      animation-delay: -0.16s;
    }
  }
}

@keyframes sk-bouncedelay {
  0%,
  80%,
  100% {
    transform: scale(0);
  }

  40% {
    transform: scale(1);
  }
}
</style>
