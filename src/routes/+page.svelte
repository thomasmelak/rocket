<script lang="ts">
  // Ensure the path is correct and the file exists

  import Configurator from '$lib/Configurator.svelte';
  import Scene from '$lib/Scene.svelte';
  import { Canvas } from '@threlte/core';
</script>

<div>
<Canvas>
  <Scene />
</Canvas>
</div>
<Configurator />

<style>
    div{
        height: 100vh;
        width: 100vw;
        overflow: hidden;
    }
</style>

