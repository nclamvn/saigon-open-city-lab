# Batch04 visual diagnosis — 2026-09-14

User supplied two screenshots showing blurred terrain colour and regularly spaced green dots. Contractor inspected the source image, renderer and compiler rather than treating successful boot as proof of realism.

## Confirmed causes

- Local Sentinel-2 RGB derivative: 330×334 = 110,220 pixels, nominal 10 m source sampling, acquired 2025-11-30. The compiler samples it onto the109×109 DEM grid; renderer makes that 11,881-pixel canvas the texture and suppresses the external image path whenever `surface_rgb` exists. This retains about10.78% of source pixel count and loses about89.22% before magnification. Interpolation further smears the reduced image. Actual information is not recovered by increasing screen DPR or enlarging the canvas.
- Native Sentinel imagery still cannot resolve street-scale facades or detailed tree crowns. Fixing the downsample is necessary but does not create sub-metre observations.
- `makeCanopy()` places one identical7-sided cone at each stride6 ETH raster sample. Sample spacing is approximately60m. Cone base3.8m is multiplied by scalar2+0.12×height (clamped), producing broad regular dots. These are not observed individual trees and should not be dressed up as such through random jitter.
- DEM and colour must have independent resolutions and accurate registration. Terrain bbox is offset slightly from the AOI centre used for local vector coordinates; the corrective contract must preserve that origin and source pixel-centre semantics.
- A centre translation from UTM easting/northing to the longitude/latitude scene axes would also omit rotation and scale. The corrected path computes texture UV at every DEM pixel centre through WGS84→UTM48N. Independent comparison with PROJ across all11,881 DEM nodes gave maximum forward error0.000000366m; inverse checks at four image corners gave maximum error0.0000267m. This verifies the numerical conversion, not the survey accuracy of source observations. Receipt: `governance/evidence/proj-transform-reference.json`.

## Authorized remedy

TIP-B04-VISUAL-DATA and TIP-B04-VISUAL-ENGINE preserve full native10m imagery, add registered continuous canopy evidence, remove cone/tree glyphs and maintain explicit uncertainty/source limits. No AI super-resolution or synthetic individual-tree inventory is introduced.

## Bounded search for sharper open imagery

OpenAerialMap provides free imagery access and CC-BY4.0 licensing according to its [terms](https://openaerialmap.org/legal/); its [API documentation](https://docs.openaerialmap.org/api/api/) describes metadata lookup. AOI metadata query on2026-09-14:

```text
https://api.openaerialmap.org/meta?limit=100&bbox=106.3276338,11.0830401,106.3576338,11.1130401
found=0; results=[]
response SHA256=282198e8d98233320cac35bd898b15e46eaebccfe7203672019312564b6bd898
```

Receipt: `governance/evidence/oam-gialoc-aoi-response.json`. This establishes zero matches in that service for this query, not an assertion that no imagery exists elsewhere.

Higher-resolution display services such as Esri World Imagery are a separate acquisition path. They are not automatically an open raster dataset merely because tiles are reachable; [Esri service terms](https://www.esri.com/en-us/legal/terms/web-site-service) and [product offering](https://www.esri.com/en-us/arcgis/products/arcgis-location-platform/services/basemaps) must be checked for the actual intended use. No commercial tiles were incorporated in this fix. The best local imagery with verified provenance remains Sentinel10m.
