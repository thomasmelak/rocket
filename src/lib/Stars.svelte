<script lang="ts">
    // @ts-nocheck

  import { T, useTask } from '@threlte/core';
  import { Instance, InstancedMesh, useTexture } from '@threlte/extras';
  import { Color, DoubleSide, Vector3 } from 'three';
  import { config } from './config.svelte';

  let STARS_COUNT = 150
  let nextId = 0
  // Palette comes from the configurator; `colorKey` detects edits to it.
  let colors = config.starColors.map(toStarColor)
  let colorKey = config.starColors.join()
  let stars: any[] = []
  

  const map = useTexture('/rocket/star.png')

  function r(min: number, max: number) {
    let diff = Math.random() * (max - min)
    return min + diff
  }

  function toStarColor(hex) {
    return new Color(hex).convertSRGBToLinear().multiplyScalar(1.3)
  }

  // Each star keeps a random slot in [0, 1), so palette edits recolor it in place
  // and every palette entry stays equally likely.
  function pickColor(star) {
    star.color = colors[Math.floor(star.colorSlot * colors.length)]
  }

  function resetStar(star): any {
    if (r(0, 1) > 0.8) {
      star.pos = new Vector3(r(-10, -30), r(-5, 5), r(6, -6))
      star.len = r(1.5, 15)
    } else {
      star.pos = new Vector3(r(-15, -45), r(-10.5, 1.5), r(30, -45))
      star.len = r(2.5, 20)
    }

    star.speed = r(19.5, 42)
    star.rad = r(0.04, 0.07)
    star.colorSlot = Math.random()
    pickColor(star)

    return star
  }

  for (let i = 0; i < STARS_COUNT; i++) {
    let star = {
      id: nextId++,
      pos: null,
      len: null,
      speed: null,
      color: null
    }

    stars.push(resetStar(star))
  }

  useTask((delta) => {
    const key = config.starColors.join()
    if (key !== colorKey) {
      colorKey = key
      colors = config.starColors.map(toStarColor)
      stars.forEach(pickColor)
    }
    stars.forEach((star) => {
      star.pos.x += star.speed * delta
      if (star.pos.x > 50) resetStar(star)
    })
    stars = stars
  })
</script>

{#await map then value}
  <InstancedMesh
    limit={STARS_COUNT}
    range={STARS_COUNT}
  >
    <T.PlaneGeometry args={[1, 0.05]} />
    <T.MeshBasicMaterial
      side={DoubleSide}
      alphaMap={value}
      transparent
    />

    {#each stars as star (star.id)}
      <Instance
        position={[star.pos.x, star.pos.y, star.pos.z]}
        scale={[star.len, 1, 1]}
        color={star.color}
      />
    {/each}
  </InstancedMesh>
{/await}
