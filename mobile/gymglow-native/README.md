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

## Password recovery release setup

In Supabase Authentication > URL Configuration, allow the mobile redirect
`gymglow://auth/callback?recovery=1` and the deployed web origin followed by
`/reset-password`. For Expo Go testing, also allow the exact Expo callback URL
created by `Linking.createURL('auth/callback')` with `?recovery=1` appended.
Keep the recovery email template linked to Supabase's `ConfirmationURL` so the
email token is verified before returning to the app.

Before release, test a reset email on a device with the app closed and already
open, invalid/expired links, mismatched passwords, and signing in with the new
password. Check input visibility with iOS and Android keyboards in login,
signup, athlete/profile editing, account settings, support, and every meet-score
field. Android's keyboard resize configuration requires a new native build.
