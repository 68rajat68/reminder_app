# Daily Reminder Notification App — Design

## Overview
A cross-platform Expo (React Native) app that schedules local notifications on-device. No backend, no internet required, 100% free.

## Architecture
Single Expo app with on-device storage and OS-level notification scheduling.
- **UI Layer:** React Native screens with React Navigation
- **Storage:** AsyncStorage for reminder persistence
- **Notifications:** expo-notifications (local scheduling, survives app kill)

## Screens
1. **Home Screen** — List of reminders with on/off toggle, swipe to delete
2. **Add/Edit Reminder Screen** — Message input + time picker + day selector

## Data Model
```json
{
  "id": "uuid",
  "message": "Time to exercise!",
  "time": "08:30",
  "days": [1,2,3,4,5,6,7],
  "enabled": true,
  "notificationIds": ["..."]
}
```

## Key Features
- Custom messages with configurable time
- Day-of-week repeat selection
- Toggle on/off without deleting
- Swipe to delete
- Works offline, no backend
- Interactive, polished UI for daily use

## Tech Stack
- Expo SDK 52+ (managed workflow)
- expo-notifications
- AsyncStorage
- React Navigation
- Run via Expo Go (no store publishing needed)

## UI Requirements
- Clean, modern, interactive design
- Smooth animations and transitions
- Dark/light mode support
- Designed for daily use — visually appealing
