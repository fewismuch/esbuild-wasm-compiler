<script setup>
import { ref } from 'vue'
import Btn from './comp/btn.vue'

const msg = ref('我是卧龙 vue!')
</script>

<template>
  <h1>{{ msg }}</h1>
  <input v-model="msg" />
  <div><Btn /></div>
</template>

<style scoped>
h1 {
  color: red;
}
</style>
