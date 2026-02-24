# Daily Reminder App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a cross-platform Expo app with polished UI that lets users create, edit, and manage daily notification reminders with custom messages and configurable times.

**Architecture:** Single Expo app using Expo Router for navigation, expo-notifications for OS-level local notification scheduling, and AsyncStorage for on-device persistence. No backend required.

**Tech Stack:** Expo SDK 54, Expo Router, expo-notifications, @react-native-async-storage/async-storage, TypeScript

---

### Task 1: Scaffold Expo Project & Install Dependencies

**Files:**
- Create: `reminder-app/` (via create-expo-app)
- Modify: `reminder-app/package.json`
- Modify: `reminder-app/app.json`

**Step 1: Create the Expo project**

```bash
cd /Users/rajatjangid/Desktop/RajatWork/reminder-app
npx create-expo-app@latest . --yes
```

**Step 2: Install dependencies**

```bash
cd /Users/rajatjangid/Desktop/RajatWork/reminder-app
npx expo install expo-notifications @react-native-async-storage/async-storage expo-device expo-haptics
```

**Step 3: Configure app.json for notifications**

Add to `app.json` plugins array:
```json
{
  "plugins": [
    "expo-notifications",
    "expo-router"
  ]
}
```

**Step 4: Verify project runs**

```bash
npx expo start
```

Expected: Metro bundler starts, app loads in Expo Go.

**Step 5: Initialize git and commit**

```bash
cd /Users/rajatjangid/Desktop/RajatWork/reminder-app
git init
git add .
git commit -m "chore: scaffold Expo project with notification dependencies"
```

---

### Task 2: Create Notification Service Module

**Files:**
- Create: `services/notifications.ts`
- Create: `types/reminder.ts`

**Step 1: Create the Reminder type**

Create `types/reminder.ts`:
```typescript
export interface Reminder {
  id: string;
  message: string;
  hour: number;      // 0-23
  minute: number;    // 0-59
  days: number[];    // 1=Sunday, 2=Monday, ... 7=Saturday (expo weekday format)
  enabled: boolean;
  notificationIds: string[]; // OS-level scheduled notification identifiers
  createdAt: number;
}
```

**Step 2: Create the notification service**

Create `services/notifications.ts` with these functions:

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Reminder } from '../types/reminder';

// Must be called at app startup
export async function setupNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }
}

export async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn('Must use physical device for notifications');
    return false;
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return status === 'granted';
}

export async function scheduleReminder(reminder: Reminder): Promise<string[]> {
  // Cancel existing notifications for this reminder
  await cancelReminder(reminder.notificationIds);

  if (!reminder.enabled) return [];

  const ids: string[] = [];

  if (reminder.days.length === 7) {
    // Daily — use DAILY trigger
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Reminder',
        body: reminder.message,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: reminder.hour,
        minute: reminder.minute,
      },
    });
    ids.push(id);
  } else {
    // Specific days — schedule one WEEKLY trigger per day
    for (const weekday of reminder.days) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Reminder',
          body: reminder.message,
          sound: 'default',
          ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour: reminder.hour,
          minute: reminder.minute,
        },
      });
      ids.push(id);
    }
  }

  return ids;
}

export async function cancelReminder(notificationIds: string[]) {
  for (const id of notificationIds) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
```

**Step 3: Commit**

```bash
git add types/ services/
git commit -m "feat: add reminder type and notification scheduling service"
```

---

### Task 3: Create Storage Service Module

**Files:**
- Create: `services/storage.ts`

**Step 1: Create the storage service**

Create `services/storage.ts`:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Reminder } from '../types/reminder';

const STORAGE_KEY = '@reminders';

export async function loadReminders(): Promise<Reminder[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  if (!json) return [];
  return JSON.parse(json);
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}
```

**Step 2: Commit**

```bash
git add services/storage.ts
git commit -m "feat: add AsyncStorage persistence service"
```

---

### Task 4: Build Home Screen UI

**Files:**
- Modify: `app/(tabs)/index.tsx` (or `app/index.tsx` depending on scaffold)
- Create: `components/ReminderCard.tsx`
- Create: `constants/theme.ts`

**Step 1: Create theme constants**

Create `constants/theme.ts` with colors, spacing, typography for a polished dark-themed UI. Include:
- Primary accent color (vibrant blue/purple gradient feel)
- Card background colors
- Text colors (primary, secondary, muted)
- Border radius, spacing scale
- Font sizes

**Step 2: Create ReminderCard component**

Create `components/ReminderCard.tsx`:
- Displays reminder message, scheduled time (formatted as "8:30 AM"), active days
- Toggle switch to enable/disable
- Swipe-to-delete gesture (or long-press to delete)
- Smooth press animation (scale down on press)
- Clean card design with subtle shadows/elevation

**Step 3: Build the Home Screen**

The home screen should have:
- App header with title "My Reminders" and greeting based on time of day
- FlatList of ReminderCard items, sorted by time
- Empty state illustration/message when no reminders exist ("No reminders yet. Tap + to create one.")
- Floating Action Button (FAB) at bottom-right to add new reminder
- Pull-to-refresh to re-sync notification schedules
- Smooth list animations (items animate in)

**Step 4: Commit**

```bash
git add .
git commit -m "feat: build home screen with reminder list and FAB"
```

---

### Task 5: Build Add/Edit Reminder Screen

**Files:**
- Create: `app/add-reminder.tsx` (Expo Router screen)
- Create: `components/DaySelector.tsx`
- Create: `components/TimePicker.tsx`

**Step 1: Create DaySelector component**

Create `components/DaySelector.tsx`:
- Row of 7 circular buttons (S M T W T F S)
- Tap to toggle individual days
- "Every day" quick-select button
- "Weekdays" quick-select button
- Selected days highlighted with accent color
- Haptic feedback on tap

**Step 2: Create TimePicker component**

Create `components/TimePicker.tsx`:
- Large, easy-to-read time display
- Tap to open native time picker (DateTimePicker)
- Display format: "8:30 AM"

**Step 3: Build Add/Edit Reminder screen**

Create `app/add-reminder.tsx`:
- Text input for reminder message (multiline, with character count)
- TimePicker component
- DaySelector component
- "Save" button (disabled until message is entered)
- If editing existing reminder, pre-fill all fields
- Pass reminder ID via route params for edit mode
- On save: create/update reminder in storage, schedule notification, navigate back
- Smooth keyboard-aware layout

**Step 4: Commit**

```bash
git add .
git commit -m "feat: build add/edit reminder screen with time and day picker"
```

---

### Task 6: Wire Up Navigation & State Management

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/index.tsx` (or tabs layout)
- Modify: `app/add-reminder.tsx`

**Step 1: Configure Expo Router layout**

Set up `app/_layout.tsx` with:
- Stack navigator wrapping home and add-reminder screens
- Custom header styling matching theme
- Screen transition animations

**Step 2: Wire up state flow**

- Home screen loads reminders from AsyncStorage on mount
- Add/Edit screen saves to storage and schedules notifications
- Home screen refreshes on focus (useIsFocused or useFocusEffect)
- Toggle switch on ReminderCard updates storage + reschedules/cancels notification
- Delete removes from storage + cancels notification

**Step 3: Add notification permission request**

- On first app launch, call requestPermissions()
- Show a friendly explanation before requesting if permissions not yet granted
- Setup notification handler in _layout.tsx (root)

**Step 4: Commit**

```bash
git add .
git commit -m "feat: wire navigation, state management, and permissions flow"
```

---

### Task 7: Polish UI — Animations, Empty States, Dark Mode

**Files:**
- Modify: all screen and component files
- Create: `components/EmptyState.tsx`
- Modify: `constants/theme.ts`

**Step 1: Add animations**

- FAB press animation (scale + shadow)
- ReminderCard entrance animation (fade in + slide up, staggered)
- Toggle switch animated color transition
- Screen transition animations
- Day selector button press animation

**Step 2: Create EmptyState component**

- Friendly illustration or icon
- "No reminders yet" message
- "Tap + to create your first reminder" subtitle
- Subtle breathing/pulse animation on the icon

**Step 3: Add system dark/light mode support**

- Use `useColorScheme()` hook
- Define light and dark color palettes in theme
- Apply throughout all components

**Step 4: Add haptic feedback**

- Light haptic on toggle
- Medium haptic on delete
- Light haptic on day selection

**Step 5: Commit**

```bash
git add .
git commit -m "feat: polish UI with animations, empty state, and dark mode"
```

---

### Task 8: Add Notification Re-sync on App Launch

**Files:**
- Modify: `app/_layout.tsx`

**Step 1: Add startup re-sync**

In the root layout, on app mount:
1. Load all reminders from storage
2. Cancel all existing scheduled notifications
3. Re-schedule all enabled reminders

This is a safety net to ensure notifications stay in sync if the OS clears them.

**Step 2: Test the full flow**

1. Create a reminder for 1 minute from now
2. Close the app completely
3. Verify notification fires
4. Open app, toggle reminder off
5. Verify no notification fires next time
6. Delete the reminder
7. Verify it's gone from the list

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add notification re-sync on app launch"
```

---

### Task 9: Final Testing & Cleanup

**Step 1: Test on both platforms**

- Test in Expo Go on iOS
- Test in Expo Go on Android
- Verify notification permissions prompt
- Verify notifications fire at correct times
- Verify toggle on/off works
- Verify delete works
- Test with multiple reminders at different times/days

**Step 2: Clean up code**

- Remove unused boilerplate files from scaffold
- Ensure consistent code formatting
- Remove console.log statements

**Step 3: Final commit**

```bash
git add .
git commit -m "chore: final cleanup and testing"
```
