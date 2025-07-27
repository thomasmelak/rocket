<script>

  import { T, useTask, useThrelte } from '@threlte/core';
  import { OrbitControls } from '@threlte/extras';
  import { onMount } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { Color, Mesh, PMREMGenerator, PlaneGeometry, Raycaster, Vector2, Vector3 } from 'three';
  import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
  import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
  import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
  import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
  import Spaceship from './spaceship.svelte';
  import Stars from './Stars.svelte';

  const { scene, camera, renderer } = useThrelte()
  /**
	 * @type {{ visible: boolean; traverse: (arg0: (child: any) => void) => void; }}
	 */
  let spaceShipRef
  let intersectionPoint
  let translY = 0
  let translAccelleration = 0
  let angleZ = 0
  let angleAccelleration = 0
  let pmrem = new PMREMGenerator(renderer)
  /**
	 * @type {import("three").WebGLRenderTarget<import("three").Texture>}
	 */
  let envMapRT

  const composer = new EffectComposer(renderer)
  composer.setSize(innerWidth, innerHeight)

  const setupEffectComposer = () => {
    const renderPass = new RenderPass(scene, camera.current)
    composer.addPass(renderPass)

    const bloomPass = new UnrealBloomPass(new Vector2(innerWidth, innerHeight), 0.275, 1, 0)
    composer.addPass(bloomPass)

    const outputPass = new OutputPass()
    composer.addPass(outputPass)
  }

  // Replaces the default render task, which does not execute because autoRender=false
  // https://threlte.xyz/docs/learn/basics/render-modes#render-modes-and-custom-rendering
  const { renderStage } = useThrelte()
  useTask(
    () => {
      if (intersectionPoint) {
        // @ts-ignore
        const targetY = intersectionPoint?.y || 0
        translAccelleration += (targetY - translY) * 0.002 // stiffness
        translAccelleration *= 0.95 // damping
        translY += translAccelleration

        const dir = intersectionPoint
          // @ts-ignore
          .clone()
          .sub(new Vector3(0, translY, 0))
          .normalize()
        const dirCos = dir.dot(new Vector3(0, 1, 0))
        const angle = Math.acos(dirCos) - Math.PI * 0.5
        angleAccelleration += (angle - angleZ) * 0.01 // stiffness
        angleAccelleration *= 0.85 // damping
        angleZ += angleAccelleration
      }

      if (envMapRT) envMapRT.dispose()

      spaceShipRef.visible = false
      scene.background = null
      envMapRT = pmrem.fromScene(scene, 0, 0.1, 1000)
      scene.background = new Color('#598889').multiplyScalar(0.05)
      spaceShipRef.visible = true

      spaceShipRef.traverse((child) => {
        if (child?.material?.envMapIntensity) {
          child.material.envMap = envMapRT.texture
          child.material.envMapIntensity = 100
          child.material.normalScale.set(0.3, 0.3)
        }
      })

      composer.render()
    },
    {
      stage: renderStage
    }
  )

  let isMobile = new MediaQuery('(max-width: 768px)');


  onMount(() => {
    setupEffectComposer()

    const planeGeo = new PlaneGeometry(20, 20)
    const mesh = new Mesh(planeGeo)

    const raycaster = new Raycaster()
    const pointer = new Vector2()

    // function onPointerMove(event) {
    //   pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    //   pointer.y = -(event.clientY / window.innerHeight) * 2 + 1

    //   raycaster.setFromCamera(pointer, $camera)
    //   const intersects = raycaster.intersectObject(mesh)
    //   intersectionPoint = intersects[0]?.point

    //   if (intersectionPoint) {
    //     // this prevents the spring motion to be different while the pointer
    //     // spans the x axis
    //     intersectionPoint.x = 3
    //   }
    // }

    // window.addEventListener('pointermove', onPointerMove)
    // return () => {
    //   window.removeEventListener('pointermove', onPointerMove)
    // }
  })
</script>

<T.PerspectiveCamera
  makeDefault
  position={isMobile.current ?[-12, 2, -5] : [-8, 6, 10]}
  fov={isMobile.current ? 48 : 24}
>
  <OrbitControls
    enableDamping
    autoRotate
    autoRotateSpeed={isMobile.current ? 2 : 0.5}
    dampingFactor={0.1}
    target={[0, 0, 0]}
  />
</T.PerspectiveCamera>

<!-- <T.DirectionalLight
  intensity={1.8}
  position={[0, 10, 0]}
  castShadow
  shadow.bias={-0.01}
/> -->
<!-- <T.AmbientLight intensity={0.1}/> -->

<Spaceship
  bind:ref={spaceShipRef}
  position={[0, translY, 0]}
  rotation={[angleZ, 0, angleZ, 'ZXY']}
/>

<Stars />