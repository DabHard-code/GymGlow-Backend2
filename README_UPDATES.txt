Changed files only:
- tsconfig.json
- vite.config.ts
- client/src/pages/competition-results.tsx
- server/routes.ts
- server/storage.ts

What was fixed:
- Removed invalid ignoreDeprecations setting
- Added target ES2020 for TS iteration support
- Fixed competition results typing so coachRecap exists on both response shapes
- Fixed /api/competition/results to always return coachRecap
- Removed impossible tuple-length checks in storage seed data
- Fixed challenge seed typing by letting the array infer the richer object shape
- Added Vite manual vendor chunking

Verification:
- npm run check passes
- npm run build could not be fully verified in this container because the uploaded project includes Windows node_modules, and esbuild/tsx needs Linux binaries here. On your machine, run npm run build after replacing these files.
