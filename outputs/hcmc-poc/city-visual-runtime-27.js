import * as THREE from 'three/webgpu';
import {
  abs, clamp, dot, float, fract, length as nodeLength, max, mix, pass, screenSize,
  screenUV, sin, smoothstep, time, vec2, vec3, vec4
} from 'three/tsl';

/*
 * City Visual Runtime 27
 *
 * Clean-room rendering utilities for the HCMC digital twin. The module keeps
 * presentation treatment separate from geospatial geometry and preserves a
 * direct renderer fallback if a backend cannot compile the screen pipeline.
 */

export function createCityRenderPipeline(renderer, scene, camera) {
  const scenePass = pass(scene, camera);
  const source = scenePass.getTextureNode();
  const depthTexture = scenePass.getTextureNode('depth');
  const texel = vec2(float(1).div(screenSize.x), float(1).div(screenSize.y));
  const sample = (x, y) => source.sample(screenUV.add(texel.mul(vec2(x, y)))).rgb;
  const sampleDepth = (x, y) => depthTexture.sample(screenUV.add(texel.mul(vec2(x, y)))).r;

  // A restrained nine-tap highlight spread. It gives lamps, sky reflections
  // and bright facades photographic shoulder roll without washing out roofs.
  const soft = source.rgb.mul(.24)
    .add(sample(1.5, 0).mul(.12)).add(sample(-1.5, 0).mul(.12))
    .add(sample(0, 1.5).mul(.12)).add(sample(0, -1.5).mul(.12))
    .add(sample(2.6, 2.6).mul(.07)).add(sample(-2.6, 2.6).mul(.07))
    .add(sample(2.6, -2.6).mul(.07)).add(sample(-2.6, -2.6).mul(.07));
  const softLuma = dot(soft, vec3(.2126, .7152, .0722));
  const highlight = smoothstep(.72, 1.42, softLuma).mul(.16);
  // Edge-aware local contrast brings back facade relief after aerial haze. It
  // is intentionally bounded: high-frequency detail is restored without the
  // white halos produced by a conventional strong unsharp mask.
  const localDetail = source.rgb.sub(soft).mul(.13);
  let graded = source.rgb.add(soft.mul(highlight)).add(localDetail);

  // A lightweight screen-depth cue darkens only discontinuities on foreground
  // geometry. It is not advertised as survey-grade AO, but supplies the contact
  // separation that procedural massing otherwise lacks at presentation scale.
  const centerDepth = depthTexture.sample(screenUV).r;
  const depthEdge = max(
    max(abs(centerDepth.sub(sampleDepth(1.25, 0))), abs(centerDepth.sub(sampleDepth(-1.25, 0)))),
    max(abs(centerDepth.sub(sampleDepth(0, 1.25))), abs(centerDepth.sub(sampleDepth(0, -1.25))))
  );
  const foreground = float(1).sub(smoothstep(.985, .9997, centerDepth));
  const depthContact = smoothstep(.000025, .0018, depthEdge).mul(foreground).mul(.105);
  graded = graded.mul(float(1).sub(depthContact));

  const luma = dot(graded, vec3(.2126, .7152, .0722));
  graded = mix(vec3(luma), graded, 1.035).sub(.5).mul(1.045).add(.5);
  // Slightly cool shadows and warm highlights create separation while keeping
  // the daylight sky neutral blue-white and concrete materially plausible.
  const shadowWeight = float(1).sub(smoothstep(.15, .58, luma));
  const highlightWeight = smoothstep(.58, 1.05, luma);
  graded = graded.add(vec3(-.004, .006, .013).mul(shadowWeight));
  graded = graded.add(vec3(.012, .006, -.004).mul(highlightWeight));

  const radial = nodeLength(screenUV.sub(.5).mul(vec2(1.0, .78)));
  const vignette = float(1).sub(smoothstep(.39, .74, radial).mul(.14));
  const grain = fract(sin(dot(screenUV.mul(screenSize), vec2(12.9898, 78.233)).add(time.mul(17.13))).mul(43758.5453)).sub(.5).mul(.006);
  graded = clamp(graded.mul(vignette).add(grain), 0, 16);

  const pipeline = new THREE.RenderPipeline(renderer);
  pipeline.outputNode = vec4(graded, source.a);
  return {
    name: 'City Visual Runtime 28 · depth-aware HDR presentation pipeline',
    scenePass,
    render: () => pipeline.render(),
    dispose: () => pipeline.dispose()
  };
}

export function createAdaptiveQuality(renderer, options = {}) {
  const nativeRatio = Math.min(devicePixelRatio || 1, options.maxRatio || 1.6);
  const minRatio = Math.min(nativeRatio, options.minRatio || 1.0);
  let ratio = nativeRatio;
  let elapsed = 0;
  let frames = 0;
  let cooldown = 0;
  let fps = 60;

  const apply = next => {
    const rounded = Math.round(THREE.MathUtils.clamp(next, minRatio, nativeRatio) * 20) / 20;
    if (Math.abs(rounded - ratio) < .025) return;
    ratio = rounded;
    renderer.setPixelRatio(ratio);
    renderer.setSize(innerWidth, innerHeight, false);
  };

  return {
    get pixelRatio() { return ratio; },
    get fps() { return fps; },
    update(dt, cameraDistance, interacting) {
      elapsed += dt;
      frames++;
      cooldown = Math.max(0, cooldown - dt);
      if (elapsed < 1.25) return;
      fps = frames / elapsed;
      const farBias = cameraDistance > 5200 ? -.1 : 0;
      if (cooldown <= 0) {
        if (fps < 43) { apply(ratio - .15); cooldown = 2.5; }
        else if (fps > 57 && !interacting) { apply(ratio + .1 + farBias); cooldown = 3.5; }
      }
      elapsed = 0;
      frames = 0;
    },
    resize() {
      renderer.setPixelRatio(ratio);
      renderer.setSize(innerWidth, innerHeight, false);
    }
  };
}

export function smoothDampScalar(state, key, target, smoothTime, dt) {
  const velocityKey = `${key}Velocity`;
  const omega = 2 / Math.max(.0001, smoothTime);
  const x = omega * dt;
  const decay = 1 / (1 + x + .48 * x * x + .235 * x * x * x);
  const change = state[key] - target;
  const velocity = state[velocityKey] || 0;
  const temp = (velocity + omega * change) * dt;
  state[velocityKey] = (velocity - omega * temp) * decay;
  state[key] = target + (change + temp) * decay;
  return state[key];
}

export function smoothDampVector(current, velocity, target, smoothTime, dt) {
  for (const axis of ['x', 'y', 'z']) {
    const state = { value: current[axis], valueVelocity: velocity[axis] };
    smoothDampScalar(state, 'value', target[axis], smoothTime, dt);
    current[axis] = state.value;
    velocity[axis] = state.valueVelocity;
  }
  return current;
}

export function updateAdaptiveShadow(light, target, cameraDistance) {
  const span = THREE.MathUtils.clamp(cameraDistance * .78, 620, 4300);
  light.target.position.copy(target);
  light.target.updateMatrixWorld();
  const shadowCamera = light.shadow.camera;
  if (Math.abs(shadowCamera.right - span) > 12) {
    shadowCamera.left = shadowCamera.bottom = -span;
    shadowCamera.right = shadowCamera.top = span;
    shadowCamera.near = Math.max(40, cameraDistance * .018);
    shadowCamera.far = Math.max(7200, cameraDistance * 1.8);
    shadowCamera.updateProjectionMatrix();
  }
}
