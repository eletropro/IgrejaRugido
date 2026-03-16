export type UserRole = 'visitor' | 'member' | 'leader' | 'pastor' | 'admin';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: UserRole;
  points: number;
  level: number;
  createdAt: string;
  lastRead?: {
    book: string;
    chapter: number;
    timestamp: string;
  };
}

export interface ChurchConfig {
  prayerEmail: string;
  pixKey: string;
  pixQrCodeUrl: string;
  liveStreamUrl?: string;
  dailyMessage?: {
    text: string;
    imageUrl: string;
    author: string;
    timestamp: string;
  };
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  type: 'text' | 'image' | 'testimony' | 'verse';
  imageUrl?: string;
  verseRef?: string;
  likes: number;
  createdAt: any;
}

export interface ChurchEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  type: 'culto' | 'vigilia' | 'conferencia' | 'campanha' | 'congresso' | 'evangelismo';
  imageUrl: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  createdAt: any;
}

export interface DiscipleshipLesson {
  id: string;
  title: string;
  content: string;
  videoUrl?: string;
  order: number;
  category: string;
}

export interface PrayerRequest {
  id: string;
  userId: string;
  userName: string;
  request: string;
  isAnonymous: boolean;
  intercessionCount?: number;
  createdAt: any;
}
