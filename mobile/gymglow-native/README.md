# GymGlow Native

This folder is a native Expo Router shell for your existing GymGlow backend.

## What is already wired up
- Supabase auth in React Native
- React Query data layer
- Home dashboard
- Athletes list
- Athlete detail screen
- Native upload flow that uses the same `Videos` storage bucket and `/api/profiles/:profileId/analyze` route
- Settings/logout screen

## Before you run it
Open `app.json` and set:
- `expo.extra.apiBaseUrl`
- `expo.extra.supabaseUrl`
- `expo.extra.supabaseAnonKey`

For a phone on your home Wi-Fi, `apiBaseUrl` should usually be something like:
`http://192.168.1.50:5000`

## Run it
```bash
cd gymglow-native
npm install
npx expo start
```

## Important note
This is the first native pass. It keeps your backend and storage flow intact instead of rewriting the whole platform at once.
