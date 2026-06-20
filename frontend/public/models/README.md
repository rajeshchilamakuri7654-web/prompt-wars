# 3D Model Assets

Drop any GLTF/GLB file here named `eco-orb.glb` and it will be automatically
loaded by the Three.js canvas as the floating background model.

## Recommended free sources
- [Sketchfab](https://sketchfab.com/features/free-3d-models) — search "plant", "earth", "leaf"
- [Google Poly](https://poly.pizza/) — low-poly optimised for web
- [Three.js examples](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf)

## Requirements
- Format: `.glb` (binary GLTF preferred for performance)
- Max size: 5MB recommended for fast loading
- PBR materials supported (MeshStandardMaterial / MeshPhysicalMaterial)

If no file is present, the visualizer runs in particle-only mode gracefully.
