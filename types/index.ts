// types/index.ts
// Wszystkie typy i interfejsy projektu Sprinter.
// Importuj typy z tego pliku: import { IUser, IActivity } from '@/types';

import { GeoPoint, Timestamp } from 'firebase/firestore';

// ─── SPORT ────────────────────────────────────────────────────────────────────

export type SportType = 'running' | 'cycling' | 'tennis' | 'gym' | 'climbing';

export type LevelType = 'beginner' | 'intermediate' | 'advanced';

export type ActivityStatus = 'proposed' | 'confirmed' | 'completed' | 'cancelled';

// ─── USER ─────────────────────────────────────────────────────────────────────

export interface IUserStats {
  avgPace?: string; // Np. "5:20" — tylko dla running/cycling
  weeklyKm?: number; // Tygodniowy przebieg w km
  activeDays?: number; // Ile dni w tygodniu trenuje
}

export interface IUser {
  userId: string; // UID z Firebase Auth — klucz główny
  name: string; // Pełne imię i nazwisko
  sport: SportType;
  level: LevelType;
  location: GeoPoint; // Aktualna pozycja GPS
  geohash: string; // Zakodowana lokalizacja do GeoFirestore queries
  bio: string; // Max 160 znaków
  stats: IUserStats;
  lastActive: Timestamp;
  blocked: string[]; // Lista zablokowanych userId
  createdAt: Timestamp;
}

// Wersja bez pól generowanych przez serwer — do tworzenia nowego profilu
export type IUserCreate = Omit<IUser, 'createdAt' | 'lastActive'>;

// ─── ACTIVITY CONDITIONS ──────────────────────────────────────────────────────

export interface IActivityConditions {
  dateTime: Timestamp;
  locationName: string;
  locationGeo: GeoPoint;
  pace?: string; // Np. "5:00" — running/cycling
  speed?: number; // km/h — cycling
  distance?: number; // km — running/cycling
  duration?: number; // minuty — gym/tennis/climbing
  climbGrade?: string; // Np. "6c" — climbing
  matchType?: string; // Np. "Treningowa" — tennis
  workoutType?: string; // Np. "Full body" — gym
}

// ─── ACTIVITY ─────────────────────────────────────────────────────────────────

export interface IActivity {
  activityId: string;
  initiatorId: string; // FK → users
  partnerId: string; // FK → users
  sport: SportType;
  status: ActivityStatus;
  conditions: IActivityConditions;
  confirmedBy: string[]; // userId którzy potwierdzili zakończenie (max 2)
  chatUnlocked: boolean; // Ustawiane TYLKO przez Cloud Function
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type IActivityCreate = Omit<
  IActivity,
  'activityId' | 'chatUnlocked' | 'confirmedBy' | 'createdAt' | 'updatedAt'
>;

// ─── MESSAGE ──────────────────────────────────────────────────────────────────

export interface IMessage {
  messageId: string;
  senderId: string; // FK → users
  text: string; // Max 1000 znaków
  sentAt: Timestamp; // serverTimestamp()
  readBy: string[]; // userId którzy przeczytali
}

export type IMessageCreate = Omit<IMessage, 'messageId' | 'sentAt' | 'readBy'>;

// ─── NOTIFICATION ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'activity_proposed'
  | 'activity_confirmed'
  | 'activity_cancelled'
  | 'chat_unlocked'
  | 'new_message';

export interface INotification {
  notificationId: string;
  recipientId: string;
  type: NotificationType;
  activityId: string;
  sent: boolean;
  createdAt: Timestamp;
}

// ─── DISCOVERY ────────────────────────────────────────────────────────────────

// Profil użytkownika wzbogacony o odległość — używany na ekranie discovery
export interface IUserWithDistance extends IUser {
  distanceKm: number; // Obliczone po stronie klienta (Haversine)
}

// Parametry filtrowania na ekranie discovery
export interface IDiscoveryFilters {
  sport: SportType;
  radiusKm: number;
  level?: LevelType;
}
