<template>
  <div id="app">
    <VoiceRecognize />
  </div>
</template>

<script>
import VoiceRecognize from "./components/VoiceRecognize.vue";
export default {
  name: "app",
  components: {
    VoiceRecognize
  }
};
</script>

<style>
#app {
  width: 100vw;
  /* height: 100vh */
}
</style>
