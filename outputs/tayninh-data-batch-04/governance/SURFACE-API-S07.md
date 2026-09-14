# SURFACE-API-S07

Load `static/solution-layer.js` and `static/s07-surface.js` before constructing fine chunks. Globals: `B04SolutionLayers.VERSION=s07.1`, `B04S07Surface.VERSION=s07.surface.1`.

## Shared materials

```js
const materialLibrary = await B04S07Surface.loadMaterialLibrary(THREE, {
  manifest, // derived/s07/materials/manifest.json, schema tayninh-s07-materials/v1
  baseUrl: document.baseURI,
  anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()),
  maxTextureSize: 1024, // optional 512 for mobile; always capped at 1024
  maxTextures: 12,
  maxEstimatedBytes: 64 * 1024 * 1024,
});
```

Consumes `assets[].maps[]` and `runtime_selection.active_asset_ids` from A's actual manifest. Paths are relative to the outputs root; the loader resolves the parent of the Batch04 base to prevent a doubled Batch04 prefix. Only active wall/roof/road roles are admitted, with CC0 license, SHA syntax, source image dimensions, color-space and OpenGL-normal descriptors. Ground-litter remains inactive for canopy. Missing physical extent is admitted only with explicit modeled-display-tiling basis: renderer defaults to 4×4 m plaster / 1.6×0.8 m brick tiles, preserving the actual 1024×512 brick aspect ratio. These are modeled display scales, not measured physical extent.

Return `{materials,textures,qa,dispose()}`. `materials.wall` is primary plaster; `.wallBrick` is sparse exposed-brick variant; `.roof`, `.asphalt` and exact asset-ID aliases are map/normalMap/roughnessMap property objects. Albedo is sRGB; normal/roughness are NoColorSpace. Map repeat is inverse tile metres; geometry UVs are metres. Sources above the runtime cap resize in the browser with source/runtime pixels reported.

Photographed roof and asphalt maps use neutral white vertex tint, preserving their existing dark albedo instead of multiplying another dark procedural palette. Missing-role procedural fallback retains S06 colors. Roof normal strength is 0.35; other material normal strength is 0.55. Source bytes and native terrain imagery are unchanged. Library QA separates actual successful `sourcePixels/runtimePixels` from planned counts when a role fails.

With a supplied roof map, the roof mesh has two merged material slots: slot 0 is the shared S06 procedural roof with varied warm/gray seeded palette; slot 1 is the photographed tile map. Only generic gable/hipped roofs with stable ID seed modulo 100 below 45 use slot 1; flat roofs always use slot 0. This style selection is modeled, not observed local material. It adds at most one roof draw per nonempty chunk and uses existing textures; consumers handle roof material arrays for opacity/disposal as for walls. `layer.qa.roofMaterialStyles` reports counts, slots and modeled selection. No roof/envelope coordinates change.

Same descriptor key returns the same load Promise/library. One material-library manifest may be resident per THREE context; dispose it before admitting another. Failed map roles are disposed and omitted, retaining successful roles with explicit `qa.failures/complete=false`; renderer falls back procedurally per missing role. Cached maps are not disposed with chunk geometry. `dispose()` is idempotent. `disposeSharedTextures(THREE)` cancels/drains pending loading and releases all surface shared maps on viewer teardown.

## Fine buildings

```js
const layer = B04SolutionLayers.buildingLayer({
  THREE, ground, frame,
  detailLevel: 'fine',
  sampleBounds: { west, east, south, north },
  chunkId,
  materialLibrary,
}, chunkFeatures, heightFor);
```

Existing signature is unchanged. Default `standard` remains S06-compatible; `coarse` creates zero facade/fine detail; `fine` builds recessed openings and automatically adds `layer.fineLayer` only for passed features intersecting sampleBounds. Return keeps `group,pickables,detailMesh,foundations,buildings,qa`; adds `fineLayer={group,pickables,qa}`. Fine scopes are not prebuilt over the AOI; C owns actual chunk selection/cache/lifetime.

Walls use cumulative perimeter U and absolute-height V, both in metres. Total input height includes roofs; foundation and envelope coordinates remain unchanged. Roof seams project onto actual base roof triangles, avoiding a reconstructed concave hip fan. Frames/panes/recess/sills/fascia stay within footprint/envelope. Sparse modeled brick styling uses a second merged wall material slot when actual `.wallBrick` exists. Consumers must handle material arrays for opacity and disposal; at most one extra wall draw is introduced per fine chunk.

`fineBuildingDetails(ctx, baseBuildings)` is also public for diagnostics; supplied base descriptors should come from a fine `buildingLayer` to include real wall openings. Actual roof planes are retained as `.roofTopTriangles`. Standalone concave fans without those triangles are skipped and counted. Fine pick payloads explicitly label modeled detail.

## Near vegetation

```js
const extra = B04S07Surface.enrichVegetation({THREE, sampleBounds, chunkId},
  baseVegetationLayer, {budget:96});
extra.updateLOD(target, radius, true);
```

Returns `{group,branches,leaves,candidates,visibleCandidates,qa,updateLOD}`. It does not replace source candidate positions or masks. C adds/visits/disposes this optional near-chunk group and calls updateLOD alongside base vegetation. Signature buckets avoid rebuilding matrices every tour frame. Above radius 650 m the branch/card counts are zero. Each near graphic tree has 7 branches and 18 alpha-cut cluster cards; default budget 96, hard cap 160. Leaf texture is one shared 128×128 modeled pointed-leaf atlas, not leaf-litter imagery or detected species.

Protect textures from `B04SolutionLayers.sharedTextures(THREE)` and `B04S07Surface.sharedTextures(THREE)` when disposing chunk geometry/materials. Release shared libraries once at viewer teardown. Native imagery is managed by C and is never modified by B.

## QA entry points

- `node scripts/s07-b-surface-check.cjs`: actual geometry/envelope/UV/steep-ground/concave/foliage checks.
- `node scripts/s07-b-material-check.cjs`: provider bytes/dimensions and actual THREE texture/cache control-flow fixtures, then Contractor real HTTP/WebGL verification.

No browser file hashing is claimed; A/build-time tests verify raw/map bytes. Estimated RGBA8 mip allocations are not measured GPU VRAM.
