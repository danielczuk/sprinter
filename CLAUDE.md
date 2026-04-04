# Sprinter — Instrukcja dla Claude

## Czym jest ten projekt

Sprinter to aplikacja mobilna do matchowania partnerów sportowych. Filozofia: **aktywność najpierw, znajomość potem**. Użytkownik wybiera sport i zasięg geograficzny, dostaje propozycje partnerów (bez zdjęć profilowych), negocjuje warunki treningu suwakami (czas, miejsce, tempo, dystans), a czat otwiera się dopiero po zakończeniu wspólnej aktywności.

Aplikacja jest bezpośrednią alternatywą dla aplikacji randkowych opartych na zdjęciach.

**Dyscypliny:** bieganie, rower, tenis, siłownia, wspinaczka
**MVP status:** w budowie
**Właściciel projektu:** Daniel Grzegorczuk

---

## Stack technologiczny

| Warstwa | Technologia | Uwagi |
|---|---|---|
| Frontend | React Native + Expo (SDK 51+) | TypeScript obowiązkowy |
| Nawigacja | Expo Router (file-based) | Nie React Navigation |
| Backend | Firebase (Firestore, Auth, Functions, FCM) | BaaS — bez własnego serwera |
| Baza danych | Cloud Firestore | NoSQL, dokumenty |
| Geolokalizacja | Expo Location + GeoFirestore | GeoHash query |
| Mapy | Google Maps SDK (react-native-maps) | |
| Push | Firebase Cloud Messaging | Przez Expo Notifications |
| Stan | Zustand | Lekki, bez boilerplate |
| Testy | Jest + React Native Testing Library | |
| Linting | ESLint + Prettier | Konfiguracja w .eslintrc.js |

---

## Struktura projektu

```
sprinter/
├── app/                        # Expo Router — ekrany (file-based routing)
│   ├── (auth)/                 # Ekrany niezalogowanych
│   │   ├── login.tsx
│   │   └── onboarding.tsx
│   ├── (tabs)/                 # Główna nawigacja po zalogowaniu
│   │   ├── discover.tsx        # Odkrywanie partnerów
│   │   ├── activities.tsx      # Moje aktywności
│   │   └── profile.tsx         # Profil użytkownika
│   ├── activity/
│   │   ├── [id].tsx            # Szczegóły aktywności
│   │   ├── negotiate.tsx       # Negocjacja warunków
│   │   └── chat.tsx            # Czat (po aktywności)
│   └── _layout.tsx
├── components/                 # Komponenty wielokrotnego użytku
│   ├── ui/                     # Czyste komponenty UI (bez logiki)
│   │   ├── UserCard.tsx
│   │   ├── SliderInput.tsx
│   │   └── Avatar.tsx
│   └── features/               # Komponenty z logiką domenową
│       ├── DiscoverFeed.tsx
│       └── NegotiationForm.tsx
├── hooks/                      # Custom hooks
│   ├── useDiscovery.ts         # Logika matchowania i geolokalizacji
│   ├── useActivity.ts          # Zarządzanie aktywnością
│   └── useChat.ts              # Realtime chat
├── services/                   # Komunikacja z Firebase
│   ├── firebase.ts             # Inicjalizacja Firebase
│   ├── users.service.ts        # CRUD na kolekcji users
│   ├── activities.service.ts   # CRUD na kolekcji activities
│   └── geo.service.ts          # Geolokalizacja i GeoFirestore
├── stores/                     # Zustand stores (stan globalny)
│   ├── auth.store.ts
│   └── discovery.store.ts
├── types/                      # TypeScript typy i interfejsy
│   └── index.ts
├── constants/                  # Stałe wartości
│   ├── sports.ts               # Definicje dyscyplin
│   └── theme.ts                # Kolory, fonty, spacing
├── utils/                      # Pomocnicze funkcje czyste
│   ├── geo.utils.ts            # Haversine, formatowanie odległości
│   └── format.utils.ts         # Formatowanie czasu, tempa
├── __tests__/                  # Testy (lustrzana struktura src)
├── functions/                  # Firebase Cloud Functions (Node.js)
│   └── src/
│       ├── index.ts
│       └── activity.functions.ts
└── CLAUDE.md                   # Ten plik
```

---

## Konwencje kodu

### Nazewnictwo
- **Komponenty React:** PascalCase → `UserCard.tsx`, `SliderInput.tsx`
- **Hooki:** camelCase z prefixem `use` → `useDiscovery.ts`
- **Serwisy:** camelCase z suffixem `.service` → `users.service.ts`
- **Typy/interfejsy:** PascalCase z prefixem `I` dla interfejsów → `IUser`, `IActivity`
- **Stałe:** SCREAMING_SNAKE_CASE → `MAX_DISTANCE_KM`
- **Zmienne i funkcje:** camelCase → `currentUser`, `fetchNearbyUsers()`

### Język
- **UI aplikacji:** po polsku (etykiety, komunikaty błędów, teksty)
- **Kod, komentarze, commity:** po angielsku
- **Nazwy zmiennych/funkcji:** angielskie

### Importy — kolejność
```typescript
// 1. React i React Native
import React, { useState } from 'react';
import { View, Text } from 'react-native';
// 2. Biblioteki zewnętrzne
import { collection } from 'firebase/firestore';
// 3. Aliasy projektu (@/)
import { UserCard } from '@/components/ui/UserCard';
// 4. Relatywne
import { formatPace } from '../utils/format.utils';
```

---

## Model danych (Firestore)

### Kolekcja `users/{userId}`
```typescript
interface IUser {
  userId: string;          // UID z Firebase Auth
  name: string;            // Pełne imię i nazwisko
  sport: SportType;        // 'running' | 'cycling' | 'tennis' | 'gym' | 'climbing'
  level: LevelType;        // 'beginner' | 'intermediate' | 'advanced'
  location: GeoPoint;      // Aktualna pozycja GPS
  geohash: string;         // Do GeoFirestore queries
  bio: string;             // Max 160 znaków
  stats: UserStats;        // { avgPace, weeklyKm, activeDays }
  lastActive: Timestamp;
  blocked: string[];       // Lista zablokowanych userId
  createdAt: Timestamp;
}
```

### Kolekcja `activities/{activityId}`
```typescript
interface IActivity {
  activityId: string;
  initiatorId: string;     // FK → users
  partnerId: string;       // FK → users
  sport: SportType;
  status: ActivityStatus;  // 'proposed' | 'confirmed' | 'completed' | 'cancelled'
  conditions: {
    dateTime: Timestamp;
    locationName: string;
    locationGeo: GeoPoint;
    pace?: string;          // Np. "5:00" — tylko dla running/cycling
    distance?: number;      // km
    duration?: number;      // minuty — dla gym/tennis/climbing
  };
  confirmedBy: string[];   // userId którzy potwierdzili zakończenie
  chatUnlocked: boolean;   // Ustawiane przez Cloud Function, nie przez klienta
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Podkolekcja `activities/{activityId}/messages/{msgId}`
```typescript
interface IMessage {
  senderId: string;
  text: string;
  sentAt: Timestamp;       // serverTimestamp()
  readBy: string[];
}
```

---

## Zasady bezpieczeństwa — nienaruszalne

1. **`chatUnlocked` może ustawiać TYLKO Cloud Function** przez Firebase Admin SDK. Nigdy klient. Nigdy bezpośrednio z aplikacji.

2. **Status aktywności** (`confirmed`, `completed`) może zmieniać tylko uczestnik aktywności lub Cloud Function.

3. **Odblokowanie czatu** wymaga że `confirmedBy` zawiera OBOJE uczestników — sprawdzane serwerowo.

4. **Geolokalizacja** — lokalizacja użytkownika jest aktualizowana tylko przy otwarciu aplikacji, nie w tle.

---

## Zasady testowania — obowiązkowe

**Nigdy nie modyfikuj testów żeby kod przechodził. Naprawiaj kod, nie testy.**

Co wymaga testu:
- Każda funkcja w `services/` i `utils/`
- Każdy custom hook (`hooks/`)
- Krytyczne komponenty UI (UserCard, SliderInput, NegotiationForm)
- Cloud Functions w `functions/`

Co nie wymaga testu w MVP:
- Proste komponenty layoutu (View, Text wrappers)
- Ekrany nawigacji (testowane e2e)

Uruchamianie testów: `npm test`
Coverage minimum: 70% dla `services/` i `utils/`

**Zakaz:** `// @ts-ignore`, `as any`, `as unknown as X` bez komentarza wyjaśniającego dlaczego.

---

## Zakres MVP — co jest, czego nie ma

### Jest w MVP
- Rejestracja/logowanie (Google Sign-In, Apple Sign-In)
- Profil: imię, sport, poziom, bio, statsy (wpisywane ręcznie)
- Discovery: geolokalizacja, karty użytkowników, filtrowanie po sporcie i zasięgu
- Propozycja aktywności z negocjacją warunków (suwaki)
- Powiadomienia push (propozycja, potwierdzenie, odblokowanie czatu)
- Potwierdzenie zakończenia przez obu uczestników
- Czat tekstowy odblokowany po aktywności
- Blokowanie użytkownika

### Nie ma w MVP — nie implementuj bez pytania
- Zdjęcia profilowe
- System ocen i recenzji
- Integracja ze Strava/Garmin
- Śledzenie GPS trasy na żywo
- Grupowe aktywności (3+ osób)
- Wersja premium / płatności
- Algorytm ML do matchowania
- Tryb offline

---

## Zmienne środowiskowe

Przechowywane w `.env.local` (nigdy nie commitować):
```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

---

## Workflow pracy z Claude

1. **Małe zadania** — jedno zadanie = jeden komponent LUB jeden hook LUB jedna funkcja serwisu. Nie łącz.
2. **Testy razem z kodem** — przy każdej nowej funkcji lub hooku od razu piszemy test.
3. **Commit po każdym działającym kroku** — nie kumuluj zmian.
4. **Na początku sesji** powiedz Claude: "przypomnij mi stan projektu" — przeczyta ten plik i da summary.

---

## Przydatne komendy

```bash
npm start              # Uruchom Expo dev server
npm test               # Uruchom wszystkie testy
npm run test:watch     # Testy w trybie watch
npm run lint           # Sprawdź ESLint
npm run type-check     # Sprawdź TypeScript (tsc --noEmit)
npm run build          # Build produkcyjny przez EAS
```
