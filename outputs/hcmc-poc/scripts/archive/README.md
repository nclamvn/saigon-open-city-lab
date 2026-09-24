# Historical browser QA

These scripts preserve acceptance tests for the retired 17/18 application shells. They target DOM contracts such as `.l16-nav`, `twinSurface18`, and `twin17Probe` that are intentionally absent from the canonical 25G WebGPU shell.

They are retained as implementation evidence, but are excluded from the current release gate. Run the current checks with:

```sh
for file in outputs/hcmc-poc/scripts/qa-*.cjs; do node "$file"; done
```
