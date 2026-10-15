# BENCH-OS

Point your phone at any device, board, motor or loose part. BENCH-OS (Gemini vision) tells you:

- **what it is** (reads part numbers where legible)
- **what's worth salvaging**, with a rough value per part and a harvest-worth rating
- **where to buy** each part or a replacement (AliExpress, Amazon, eBay, Google Shopping, plus Octopart/LCSC/datasheets for part numbers)
- **what else to buy** to repair it or make the parts useful
- answers to free-form questions about what's in front of the camera

Other modes: Solder Coach (joint inspection + 3-second-rule pacer), Build Advisor (projects from your parts bin), Device Doctor (why is it dead?) and a 3-minute craving-override challenge.

Live: **https://bench.arpcloudsolutions.co.za**

## Run locally

```bash
npm install
cp .env.example .env   # add GEMINI_API_KEY
npm run dev            # http://localhost:3000
```

Phones only allow the live camera over **HTTPS** (or localhost). To test on your phone against your local machine, use either:

- `tailscale serve 3000` (private to your tailnet), or
- `cloudflared tunnel --url http://localhost:3000` (public URL - set `APP_ACCESS_KEY` first)

The **PHOTO** button uses the phone's own camera app and works even over plain HTTP.

## Deploy (Vercel)

The repo is linked to the `bench-os` Vercel project. Serverless functions live in `api/`, shared logic in `lib/`.

```bash
npx vercel deploy --prod
```

Environment variables (Production): `GEMINI_API_KEY` (required), `APP_ACCESS_KEY` (recommended), optional `GEMINI_MODEL`.
DNS: `bench` CNAME → the target shown by `npx vercel domains verify bench.arpcloudsolutions.co.za` (zone is in AWS Route 53).

### Models

Default chain (see `lib/analyze.ts`): `gemini-3.5-flash-lite` → `gemini-3.5-flash` → `gemini-2.5-flash` → `gemini-flash-lite-latest`.
Benchmarked 2026-10-15 on real PSU / hard-drive / Arduino photos: flash-lite answered in 5-12s with the most accurate
part boxes, while the full Flash models were often overloaded (503s that can take ~25s). Build advice, device-doctor
and questions run with more thinking. To try another model without a code change, set `GEMINI_MODEL` (comma-separated)
on Vercel and redeploy.

## Android APK (Capacitor)

The APK bundles the UI locally and calls the hosted API at `VITE_API_BASE` (`.env.native`).

Requirements: JDK 21, Android SDK (`ANDROID_HOME`).

```bash
npm run android:apk
# -> android/app/build/outputs/apk/release/app-release.apk
```

Release signing reads `android/keystore.properties` (git-ignored) which points at the keystore. **Back up the keystore and that file** - without them you cannot ship updates that install over the existing app.

Bump `versionCode` / `versionName` in `android/app/build.gradle` for each new APK.

## Scripts

| script | what |
| --- | --- |
| `npm run dev` | Express + Vite dev server |
| `npm run serve` | production build served by Express |
| `npm run lint` | strict TypeScript check |
| `npm run build:native` | web bundle for the APK |
| `npm run android:apk` | build + sync + signed release APK |
| `npm run icons` | regenerate PWA + Android icon sources |
