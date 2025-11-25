export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum PlanType {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  plan: PlanType;
  dailyUsageMinutes: number;
  avatarUrl?: string;
  xp: number;
  streak: number;
  referralCode: string;
  joinDate: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isImage?: boolean;
  imageUrl?: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'Creative' | 'Productivity' | 'Learning' | 'Lifestyle';
  isNew?: boolean;
}

export type ViewState = 
  | 'landing' 
  | 'login' 
  | 'signup' 
  | 'dashboard' 
  | 'chat' 
  | 'tools' 
  | 'profile' 
  | 'subscription' 
  | 'founder' 
  | 'admin'
  | 'pricing'
  | 'about';

export interface AnalyticsData {
  name: string;
  value: number;
}
