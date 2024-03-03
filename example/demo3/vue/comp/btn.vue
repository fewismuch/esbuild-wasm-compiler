<script setup lang="ts">
import { ref } from 'vue'
import { random } from 'lodash-es'

const count = ref<number>(0)

console.log(random(1, 10))
</script>

<template>
  <button @click="() => (count += 1)">Click me {{ count }}</button>
</template>

<style scoped></style>
