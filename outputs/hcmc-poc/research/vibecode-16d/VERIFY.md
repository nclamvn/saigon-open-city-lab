# Contractor verification — Times Square 16d R2

## REQUIREMENT COVERAGE

5/5 requirements implemented (100%): R1 coherent whole-wall finish; R2 original lettering high-resolution texture; R3 provenance and inferred regions; R4 original decoration suppression and reversible A/B; R5 browser visual verification. No missing requirement.

## SCENARIO RESULTS

- Initial R1 preview FAILED (major visual): solid blue finish still looked like a photographic sticker. Replaced before acceptance.
- Final R2 straight view PASS: original pale vertical panels continue down to the base via sign-free texture, surrounding walls have source-sampled glass, no generic pale green grid border.
- Final R2 oblique view PASS: visible front and side remain clad; no former white crossing ledges or z-fighting observed.
- Lettering PASS at close viewing distance: TIMES SQUARE readable, top of sign not cut; original source pixels preserved, no invented font or repeated sign.
- A/B PASS: source finish and suppression turn off/on; visible generic green grid restores in baseline. Same camera before/after at position [-810.8565,138.2089,397.1845], target [-747.4885,111.4966,533.5198].
- Close zoom PASS: '=' reduces distance from approximately 152 m to 134 m without jumping out to 250 m. Existing navigation clamps fixed for facade view only.
- Runtime PASS: ready=true, wallFaces=7, continuousMaterial=true, signFreeExtension=true, errors=[]; browser console errors=[].

Browser: existing in-app tab 13, /hcmc-poc/?v=16d-r2&view=facades&facade=times. Initial fly-in must settle before input; pointer input correctly interrupts a fly-in, so early tool gestures are not acceptance evidence. Final angles and A/B above were performed after cameraSettled=true.

## TECHNICAL HEALTH

4 changed JavaScript files syntax checked, 0 syntax errors. Times source/texture contracts 13/13 PASS; occlusion 9/9 PASS; performance controller 8/8 PASS; demo 19/19 PASS; leadership 16/16 PASS; facade source/anchor integrity PASS for 20 records (15 eligible, 5 held). Zoom handler regression 6/6 PASS. Old facade15b capture files are historical and not counted as current16d visual evidence. Standalone package updated (51,222,515 bytes), Builder reports 5/5 package checks.

## OVERALL STATUS

READY within the declared approximation scope. No deferred defect in this change. This does not certify full photographic reconstruction, current condition, measured facade placement or exact roof profile. Source photograph is dated 2020-01-16; occluded lower body and other walls use explicitly inferred repeated glass samples. Footprint and height unchanged. No UAV or planning geometry introduced.
