# Public reactor port

This directory ports the approved NEXUS FIVE reactor scene from the local Tag-1 source package (`G01 Gesamtfreigabe 2026-09-12`) into an isolated static demonstration. `approved-source.json` records hashes of the upstream originals, not of this adapted copy.

The only change to `scene.mjs` is the GLB URL: the original root-relative path was changed to a module-relative URL so the asset works below the GitHub Pages repository path. The GLB in `dist/reactor-assembly/` retains the upstream SHA-256 `1890d61725187ef10753ceb5ff4443716a431e4f5bb8d4602c3545fb444cf18c`.

The scene receives only synthetic state from `dist/tag1-state.js`. No production API, participant data, game answers, or original case logic is included. `dist/tag1-demo.js` owns the simplified public interaction, which is explicitly labeled as a demonstration.
