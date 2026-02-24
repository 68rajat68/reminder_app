export interface Reminder {
  id: string;
  message: string;
  hour: number; // 0-23
  minute: number; // 0-59
  days: number[]; // 1=Sunday, 2=Monday, ... 7=Saturday (expo weekday format)
  enabled: boolean;
  notificationIds: string[]; // OS-level scheduled notification identifiers
  createdAt: number;
}
