"""Build structured research records from retained primary snapshots; no product mutations."""
from pathlib import Path
from datetime import datetime,timezone
import json,hashlib

campaign=Path('outputs/tayninh-imagery-campaign-05')
evidence=campaign/'evidence/techniques'
index=json.loads((evidence/'acquisition-index.json').read_text())
sources={x['id']:x for x in index}
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
licenses={
 'three':'MIT; bundled Batch04 renderer is r160, current docs require compatibility QA.',
 'gdal':'General MIT-style license; retain LICENSE.TXT including component exceptions.',
 'colmap':'BSD 3-clause; bundled dependencies can have separate licenses.',
 'odm':'AGPL-3.0; code license, not permission for arbitrary captured imagery.',
 'nerfstudio':'Apache-2.0 code; input imagery and model artifacts separate.',
 'gsplat':'Apache-2.0 implementation; imported data/checkpoints separate.',
 'gaussian-original':'Research/evaluation noncommercial only; commercial use requires Inria consent. Not permissive commercial open source.',
 'spark':'MIT viewer/renderer, not a capture dataset or training entitlement.',
 'supersplat':'MIT editor/viewer, imported splat/data license separate.',
 'opensr-model':'MIT base and MIT-CompVis adapted LDM retained in LICENSE; no downloaded checkpoint license audit in C05.',
 'opensr-test':'MIT benchmark code; reference datasets retain their own licenses.',
 'highres-net':'Cumulative Apache-2.0 and modified Do No Harm terms; not Apache-only.',
 'cesium':'Apache-2.0 engine; imagery/terrain/tiles/hosted services separate.',
 'maplibre':'BSD 3-clause main code plus retained legacy/component notices.',
 'stereo-pipeline':'Apache-2.0 implementation; source stereo/RPC/image licenses separate.',
 'eth-canopy':'MIT code; Batch03 acquired canopy data provenance/license remains separate.',
 'opencv':'Apache-2.0 code; captured facade images require separate permission.',
 'blender-license':'Blender software GPL; output artwork is not automatically GPL. External assets separate.',
 'polyhaven-license':'Provider states assets CC0; website content is not all CC0. No assets acquired in C05.'}

def source(slug):
 x=sources[slug]
 assert x['status']=='verified_primary_snapshot',slug
 result={k:x[k] for k in ['id','publisher','repository','url','commit','default_branch','status','license_spdx_from_provider','snapshots'] if k in x}
 result['license_note']=licenses.get(slug,'Primary documentation/paper retained as evidence; not a license grant for input imagery, trained weights or third-party assets.')
 for s in result['snapshots']:assert sha(s['path'])==s['sha256'],s['path']
 return result

audit=json.loads((evidence/'batch04-source-audit.json').read_text())
data=[
 {'id':'C05-T01','title':'Native textures, filtering, raster overviews and GSD-aware LOD','priority':'P0','readiness':'existing_native_path; further gates/LOD proposed',
 'prerequisite_inputs':['Native RGB raster plus dimensions/geotransform/nodata.','Camera distance, viewport, GPU filtering limits.'],
 'trustworthy_output':['Preserved native samples and correctly loaded/registered texture.','Controlled aliasing and view-distance behavior.'],
 'modeled_or_inferred':['Filter interpolation and mipmap samples; sharpened appearance is a display choice.'],
 'unrecoverable_from_10m':['House windows, facade materials, exact roof ridges and occluded sides.'],
 'geometry_constraints':['UV from source CRS; preserve pixel-center convention; mask crop edges.','Terrain mesh sampling and texture sampling are distinct.'],
 'accuracy_limits':['Anisotropy, DPR and more output pixels do not improve source GSD or measured positional accuracy.'],
 'tools_and_licenses':['Three MIT','GDAL general MIT-style with component notices'],
 'computational_effort':'Low: CPU overview generation, browser GPU; engineering estimate 1–2 days including P0 QA, not measured benchmark.',
 'project_fit':'Highest immediate fit: native330x334 already exists; 109x109 remains degraded fallback. Gate both paths before further imagery work.',
 'blockers':['No browser A/B implementation or runtime raycast in this research scope.'],
 'source_ids':['three','three-texture','gdal','gdal-overviews']},
 {'id':'C05-T02','title':'Georegistration, CRS, pixel centers and vertical datum','priority':'P0','readiness':'existing_source_CRS_UV; additional QA proposed',
 'prerequisite_inputs':['Source CRS/geotransform, AOI, nodata, source epochs.','Independent landmarks/controls and vertical datum for accuracy claim.'],
 'trustworthy_output':['Reproducible coordinate transform and resampling lineage.'],
 'modeled_or_inferred':['Resampled pixel values and interpolation between raster nodes.'],
 'unrecoverable_from_10m':['Survey control, precise cadastral boundary and centimeter ortho.'],
 'geometry_constraints':['Horizontal and vertical reference tracked separately; check corners/edges/landmark residuals.','Common grid, datum and epoch before DSM-DTM subtraction.'],
 'accuracy_limits':['Valid EPSG and georeferenced file do not prove survey accuracy.'],
 'tools_and_licenses':['GDAL general MIT-style with component licenses'],
 'computational_effort':'Low CPU reprojection/QA; landmark/control acquisition is separate effort.',
 'project_fit':'Required base for all model and imagery overlays; current UTM source-to-scene UV should be retained.',
 'blockers':['No independent surveyed GiaLoc checkpoints.'],
 'source_ids':['gdal','gdal-warp','copdem-dsm']},
 {'id':'C05-T03','title':'DSM exaggeration, foundation and continuous canopy diagnosis','priority':'P0','readiness':'source_diagnosed; runtime_fixes_proposed',
 'prerequisite_inputs':['Current COPDEM DSM109x109, exag2.5, building footprints and anchors.','ETH modeled canopy raster plus uncertainty/nodata.'],
 'trustworthy_output':['Exact parameter disclosure and reproducible source-model diagnostics.','Comparison of 1x and exaggerated displays after implementation.'],
 'modeled_or_inferred':['Terrain interpolation, vertical exaggeration and area-derived proxy building height.','Canopy pixel height prediction, not individual trees.'],
 'unrecoverable_from_10m':['Bare-earth surveyed DTM, per-building heights, tree stems/species/positions.'],
 'geometry_constraints':['Update terrain and all object anchors together when exag changes.','Check full footprint vertices against terrain, not only arithmetic mean base.'],
 'accuracy_limits':['Internal predicted clearances and raster gradients are not surveyed error.','Canopy current meshY contains no canopy-height displacement, coneCount0.'],
 'tools_and_licenses':['Three MIT','ETH canopy repository MIT code; data license/provenance retained upstream'],
 'computational_effort':'Low CPU source/raycast QA; browser A/B 1x/1.35x. No new training required.',
 'project_fit':'Explains residual mounds and possible floating foundations without blaming already removed cones.',
 'blockers':['Independent runtime raycast/vertex checks and local checkpoints not yet done.'],
 'source_ids':['copdem-dsm','eth-canopy','three']},
 {'id':'C05-T04','title':'Honest deterministic procedural PBR roofs, facades and vegetation','priority':'P1','readiness':'ready_to_prototype_with_existing_footprints',
 'prerequisite_inputs':['Verified footprint IDs/polygons; observed height/roof/material fields remain null if unknown.','Deterministic rule seeds; optional separately acquired licensed generic assets.'],
 'trustworthy_output':['Source-constrained footprint geometry and explicit modeled render mode.'],
 'modeled_or_inferred':['Generic gable/hip/flat roofs, eaves, walls, roughness/normal materials, decorative vegetation.'],
 'unrecoverable_from_10m':['Actual roof type/color, doors/windows, floor count, facade photo and tree individuals.'],
 'geometry_constraints':['Preserve concavity/holes/winding; ridge/eaves and triangulation must be checked.','Metric UVs and foundations checked at vertices; deterministic ID linkage.'],
 'accuracy_limits':['Looks plausible is not observed geometry; screenshot quality is a separate acceptance measure.'],
 'tools_and_licenses':['Three MIT PBR','Blender GPL software; authored output not automatically GPL','Poly Haven assets CC0, website not allCC0; no asset acquired here'],
 'computational_effort':'Engineering estimate3–7 days smallAOI pilot; CPU authoring, browser GPU instancing/LOD, actual memory/frame benchmarking needed.',
 'project_fit':'Best near-term aesthetic uplift before Hera while preserving source truth; separate modeled material mode from data mode.',
 'blockers':['Observed height/material/roof unknown; not a blocker for labeled proxies. External assets require actual acquisition/license.'],
 'source_ids':['three','three-pbr','blender-pbr','blender-license','polyhaven-license','reference-process']},
 {'id':'C05-T05','title':'Photographic facade rectification and correct-building matching','priority':'P2','readiness':'blocked_on_verified_local_photos',
 'prerequisite_inputs':['Licensed/date-stamped local facade photo, matched footprint ID and facade direction.','Planar controls and camera calibration/pose as applicable; reviewer match.'],
 'trustworthy_output':['Rectified photograph of observed plane with correspondence/transform receipt.'],
 'modeled_or_inferred':['Homography/camera pose estimation; unseen facade stays neutral proxy.'],
 'unrecoverable_from_10m':['Actual facade photo, hidden sides/depth, signs and windows.'],
 'geometry_constraints':['Planar homography only; facade normal/object match verified.','Camera EXIF location alone cannot identify the photographed building.'],
 'accuracy_limits':['Reprojection fit does not prove global survey registration; depth cannot be recovered from one planar warp.'],
 'tools_and_licenses':['OpenCV Apache-2.0; source photo rights separate'],
 'computational_effort':'Low CPU perspective warp, medium manual match/review; a few days only after valid photos exist.',
 'project_fit':'High benefit for selected hero facades when photos arrive; not whole-city automated texture truth.',
 'blockers':['No verified local facade image acquisition in C05.'],
 'source_ids':['opencv','opencv-homography']},
 {'id':'C05-T06','title':'SfM/MVS metric textured mesh with COLMAP/ODM','priority':'P2','readiness':'blocked_on_capture_controls',
 'prerequisite_inputs':['Overlapping sharp images of stable scene with sufficient baselines and intrinsics.','Scale/georeference and surveyed controls plus heldout checkpoints for metric accuracy.'],
 'trustworthy_output':['Estimated camera poses/sparse cloud; dense mesh/point cloud/orthophoto where valid image observations support reconstruction.'],
 'modeled_or_inferred':['Feature matching, bundle adjustment, stereo depths and hole filling/interpolation.'],
 'unrecoverable_from_10m':['High-resolution house mesh and hidden facade geometry from current TCI.'],
 'geometry_constraints':['Nondegenerate view network, coverage/no-data and camera report.','CRS/datum/scale and checkpoints separate from fitting controls.'],
 'accuracy_limits':['Glass, water, moving vegetation and occlusions can fail; no automatic centimeter claim.','Textured mesh is reconstruction, not source-footprint extrusion.'],
 'tools_and_licenses':['COLMAP BSD3 with dependency licenses','ODM AGPL-3.0'],
 'computational_effort':'Medium-high CPU/RAM; CUDA denseMVS/build-dependent acceleration. Capture pilot and benchmark rather than promise training time.',
 'project_fit':'One cluster pilot after ground/aerial imagery; reusable HCMC pipeline does not make its assets GiaLoc facts.',
 'blockers':['Images/calibration/controls/ground access absent.'],
 'source_ids':['colmap','colmap-tutorial','odm','odm-gcp']},
 {'id':'C05-T07','title':'NeRF radiance field novel views','priority':'P2_optional','readiness':'blocked_on_calibrated_multiview_capture',
 'prerequisite_inputs':['Multiple views of same scene with poses, scale/georef for placement and capture rights.'],
 'trustworthy_output':['Appearance synthesis within captured view coverage.'],
 'modeled_or_inferred':['Learned radiance/density and novel-view pixels.'],
 'unrecoverable_from_10m':['Local photo-real facade radiance and unseen geometry.'],
 'geometry_constraints':['Georeferenced boundedROI, heldout views and coverage; density is not automatically survey surface.'],
 'accuracy_limits':['Novel-view visual fit is separate from geometry/measurement; outsidecoverage may fail.'],
 'tools_and_licenses':['Nerfstudio Apache-2.0; datasets/models separate'],
 'computational_effort':'GPU/CUDA training, medium-high; measured ROI benchmark needed.',
 'project_fit':'Optional local hero experiment, not immediate fix for entireAOI.',
 'blockers':['No calibrated multiview dataset.'],
 'source_ids':['nerf-paper','nerfstudio']},
 {'id':'C05-T08','title':'3DGS capture, permissive implementation and web viewers','priority':'P2_optional','readiness':'blocked_on_capture;viewer_tooling_verified',
 'prerequisite_inputs':['Calibrated multiview photos/SfM initialization, stable scene, georeference and licenses.'],
 'trustworthy_output':['Captured-appearance rendering inside viewpoint coverage.'],
 'modeled_or_inferred':['Optimized Gaussian positions/covariances/opacity/appearance; not watertight measured mesh.'],
 'unrecoverable_from_10m':['Photo-real local house splat scene or hidden surfaces.'],
 'geometry_constraints':['Coverage/no-data/floaters review; source frame at1x; survey mesh separate for collision/measurement.'],
 'accuracy_limits':['Splat centers and apparent surfaces do not establish building heights or cadastral accuracy.'],
 'tools_and_licenses':['gsplat Apache2 trainer implementation','Spark MIT renderer','SuperSplat MIT editor/viewer','Original Inria implementation research/noncommercial, commercial consent required'],
 'computational_effort':'CUDA training and substantial browserGPU memory; bounded splatcount/streaming and mobile benchmark.',
 'project_fit':'Small heroROI after real capture; Spark fits currentThree but viewer cannot manufacture input.',
 'blockers':['Capture/poses absent; original implementation is not generally commercial-permissive.'],
 'source_ids':['gaussian-paper','gaussian-original','gsplat','spark','spark-docs','supersplat']},
 {'id':'C05-T09','title':'Multiframe super-resolution of stable repeated imagery','priority':'P2_research','readiness':'blocked_on_sequence_adaptation_validation',
 'prerequisite_inputs':['Many near-date cloud-masked radiometrically consistent images, subpixel shifts and good registration/PSF.','Heldout frames and preferably samearea HR reference.'],
 'trustworthy_output':['Reconstructed image grid and measured consistency where validation supports it.'],
 'modeled_or_inferred':['Recoverable aliased signal plus model priors/interpolation; reconstructeddetail separately labeled.'],
 'unrecoverable_from_10m':['Guaranteed submeter local roofs/facades and newlybuilt-house confirmation.'],
 'geometry_constraints':['Stable scene, co-registration and change masks; two year-separatedepochs are not a stable burst.'],
 'accuracy_limits':['HighRes-net tested on PROBA-V; adaptation toSentinel2 is not verified by applying originalweights.','SR output grid spacing is not native observedGSD.'],
 'tools_and_licenses':['HighRes-net cumulative Apache2 and modifiedDoNoHarm restrictions, not Apache-only'],
 'computational_effort':'High adaptation/training GPU and HR validation effort; no current pilot runtime measured.',
 'project_fit':'Research after dataP0/PBR; no immediate house-detail remedy.',
 'blockers':['Stable sequence, Sentineladaptation/weights, HR reference and licensefit missing.'],
 'source_ids':['highres-paper','highres-net']},
 {'id':'C05-T10','title':'Sentinel learned/diffusion SR and band-superresolution distinction','priority':'P2_research','readiness':'blocked_on_4band_inputs_HR_validation',
 'prerequisite_inputs':['Native RGBNIR4-band SentinelGeoTIFF/.SAFE, masks and georef; model/checkpoint version/license.','Independent HR images for site hallucination/omission validation.'],
 'trustworthy_output':['Clearly labeled model-SR layer and measured spectral/spatial consistency.'],
 'modeled_or_inferred':['Learned/diffusion highfrequency details and finer outputgrid.'],
 'unrecoverable_from_10m':['Guaranteed actual windows/roofmaterial/houseappearance or cadastral detail.'],
 'geometry_constraints':['Output geotransform and seed/version lineage; originalaccessible; not fed into observed-change claims.'],
 'accuracy_limits':['OpenSR-test HR metric cannot be claimed for GiaLoc withoutHR.','DSen2 handles20/60m bands to10m, not proof that10m RGB can recover submeterhouses.'],
 'tools_and_licenses':['ESAOpenSR model MIT plus MIT-CompVis adaptedLDM; checkpoint license not independently audited/downloaded','OpenSR-test MIT; reference-data licenses separate','DSen2 paper retained, no implementation/license grant assumed'],
 'computational_effort':'GPU inference pilot can be bounded; input/HRvalidation dominates readiness. Training/runtime not benchmarked.',
 'project_fit':'Optional clearly separated experiment after4band acquisition, not replace observedtexture.',
 'blockers':['B04 TCI has3channels; RGBNIR/masks, checkpoint audit and localHR reference absent.'],
 'source_ids':['opensr-model','opensr-test','dsen2-paper','sentinel-bands']},
 {'id':'C05-T11','title':'Stereo DSM and robust building-height extraction','priority':'P3','readiness':'blocked_on_suitable_stereo_or_survey',
 'prerequisite_inputs':['Stereoimage pairs with resolution/baseline/parallax, camera/RPC calibration and licenses.','Samegrid/datum/epoch DSM-DTM, masks, controls/checkpoints for heights.'],
 'trustworthy_output':['Stereo pointcloud/DSM where matching is valid; validated height estimates only after controls.'],
 'modeled_or_inferred':['Stereo matching/depth, raster interpolation and footprint statistics.'],
 'unrecoverable_from_10m':['657 per-house heights or centimetric ortho from currentSentinel/COPDEM.'],
 'geometry_constraints':['Epipolar/parallax geometry and RPC/model QA; canopy not DTM.','Do not subtractETH canopy prediction fromCOPDEM as bareearth measurement.'],
 'accuracy_limits':['Two epochs are not automatically stereo; vegetation, datum and epoch mismatches cause false height.'],
 'tools_and_licenses':['Ames Stereo Pipeline Apache2, source imagery separate'],
 'computational_effort':'High CPU/RAM, parallel stereo; actual pair-specific benchmark needed.',
 'project_fit':'After Hera/highresolution capture, not now. Exact AOI catalogue has no densePointCloud in rootbaseline query.',
 'blockers':['Suitable stereo/RPC or LiDAR and controls absent.'],
 'source_ids':['stereo-docs','stereo-pipeline','copdem-dsm']},
 {'id':'C05-T12','title':'Geospatial engines and streaming LOD architecture','priority':'P0_local_LOD;P3_city_scale','readiness':'localThree_ready;engine_migration_not_needed_now',
 'prerequisite_inputs':['Georeferenced meshes/raster/points with bounds, geometricerror and datalicenses.','Scale/performance targets and local/ECEF transforms.'],
 'trustworthy_output':['Robust camera/LOD/streaming and correctly positioned existingpayloads.'],
 'modeled_or_inferred':['CoarseLOD simplification and rendering interpolation.'],
 'unrecoverable_from_10m':['Better nativeimagery, measured roofs/heights or centimeteraccuracy by enginechange alone.'],
 'geometry_constraints':['CRS/local/ECEF, bounds and geometricerror budget; material/textureLOD separately.'],
 'accuracy_limits':['GeometricError/LOD threshold is not measured surveyRMSE.'],
 'tools_and_licenses':['Three MIT','Cesium Apache2, hosteddata/services separate','MapLibre BSD3 plus componentnotices','OGC3DTiles standard document evidence, not inputdata license'],
 'computational_effort':'Low localmeshLOD; high productiontiling/migration and GPU/network benchmarking.',
 'project_fit':'KeepThree smallAOI; Cesium/3DTiles for widerterrain/building/pointcloud streaming; MapLibre forGIS map/query.',
 'blockers':['No benefit from migration alone for current10m blur. Largerextent payload/performance case required.'],
 'source_ids':['three','cesium','cesium-tiles','ogc-tiles','maplibre','maplibre-terrain']},
 {'id':'C05-T13','title':'GEDTM30 v1.2 modeled DTM plus RF spread bounded acquisition','priority':'P1b_pilot_acquired','readiness':'acquired_read_QA;not_integrated_live',
 'prerequisite_inputs':['Official Zenodo18887460 external30m COGURLs, AOI and HTTPRange support.','Datum/grid/epoch and checkpoints before replacing terrain or heightanalysis.'],
 'trustworthy_output':['Actual provider-grid109x109 DTM and uncertainty AOIwindows, rawRange bytes/headers/hashes.','ExactAOI108x108 bilinear-derivedGeoTIFF, native-grid browserPNG/worldmetadata and between-product statistics.'],
 'modeled_or_inferred':['RandomForest predictedbareearth height; uncertainty is individualtreeprediction spread.','Exactboundsgird bilinear resampling, not newdetail.'],
 'unrecoverable_from_10m':['Local denseLiDAR, surveyedfoundation, perbuildingheight and flood/drainage model.'],
 'geometry_constraints':['Actual TIFFtags EGM2008/EPSG3855, horizontalEPSG4326, one arcsecond; scale1offset0.','Original providerwindow retains grid and covers AOI; PNG masks bypixelcenter; exactAOIgrid is explicitlyresampled.'],
 'accuracy_limits':['Release testing-only; no GiaLoc checkpoints. Modelspread is not guaranteed localerror.','DSM-DTM comparison includes497 negativepixels, cannot be assumed canopy/buildingheight.'],
 'tools_and_licenses':['GEDTM30 data CC BY4.0 primary metadata/README','Rasterio1.5.1/GDAL temporary analysis runtime, not product dependency'],
 'computational_effort':'Completed bounded acquisition13,238,272 providerbytes, CPUcrop/QA; no globalraster download.',
 'project_fit':'Strong accessible terraincandidate against DSMcanopy effects; reliefreduction modest, exagfix stillpriorityP0.',
 'blockers':['Siteaccuracy/controls absent; live terrain swap not authorized in research scope.'],
 'source_ids':[]},
]
baseline=[('gedtm-release','https://zenodo.org/api/records/18887460','c05-gedtm-zenodo.json'),('gedtm-readme','https://codeberg.org/openlandmap/GEDTM30/raw/branch/main/README.md','c05-gedtm-readme.md')]
gedtm_sources=[]
for slug,url,name in baseline:
 p=campaign/'evidence/baseline/providers'/name
 gedtm_sources.append({'id':slug,'url':url,'status':'verified_primary_snapshot','license_note':'Dataset CC BY4.0; primary release testing-only; code/data licenses distinguished.','snapshots':[{'path':str(p),'sha256':sha(p),'bytes':p.stat().st_size,'role':'primary_dataset_metadata_or_readme','captured_date':'2026-09-14; provider receipt retained by Contractor'}]})
qa=json.loads((evidence/'gedtm-pilot/qa.json').read_text())
for record in data:
 record['schema']='c05.technique.v1';record['reviewed_at']=datetime.now(timezone.utc).isoformat()
 record['sources']=[source(slug) for slug in record.pop('source_ids')]
 record['input_files']=audit['input_files'] if record['id'] in ['C05-T01','C05-T02','C05-T03','C05-T04'] else []
 if record['id']=='C05-T13':
  record['sources']=gedtm_sources;record['input_files']=qa['input_files'];record['qa']=qa
  record['evidence_files']=[{'path':str(evidence/'gedtm-pilot/qa.json'),'sha256':sha(evidence/'gedtm-pilot/qa.json')}]
  for layer in qa['layers'].values():record['evidence_files'].extend(layer['files'])
  record['evidence_files'].extend([qa['range_receipts'],qa['comparison']])
  receipts=json.loads(Path(qa['range_receipts']['path']).read_text())
  record['raw_provider_ranges']=[{k:r[k] for k in ['path','sha256','range','provider_url','bytes','captured_at'] if k in r} for r in receipts if r.get('path')]
 if record['id']=='C05-T03':record['evidence_files']=[{'path':str(evidence/'batch04-source-audit.json'),'sha256':sha(evidence/'batch04-source-audit.json')}]
out=campaign/'research/technique-sources.json';out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print('techniques',len(data),'primary_sources',len(index),'manifest_sha256',sha(out))
