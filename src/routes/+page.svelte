<script lang="ts">
  // Ensure the path is correct and the file exists

  import Scene from '$lib/Scene.svelte';
  import { Canvas } from '@threlte/core';
</script>

<div>
<Canvas>
  <Scene />
</Canvas>
</div>

<style>
    div{
        height: 100vh;
        width: 100vw;
        overflow: hidden;
    }
</style>

