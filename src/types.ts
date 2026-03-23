export type Plan = 'free' | 'basic' | 'premium' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  plan: Plan;
  selectedTool?: string;
  createdAt: any;
  lastDailyReset: any;
  dailyUsageCount: number;
  connections?: {
    youtube?: {
      id: string;
      title: string;
      thumbnail: string;
      accessToken: string;
      refreshToken: string;
    };
    instagram?: {
      id: string;
      username: string;
      accessToken: string;
    };
  };
}

export interface ChatMessage {
  id?: string;
  userId: string;
  role: 'user' | 'model';
  content: string;
  timestamp: any;
}

export interface GeneratedFile {
  id?: string;
  userId: string;
  type: 'image' | 'prompt' | 'social' | 'video';
  url?: string;
  prompt: string;
  result?: string;
  timestamp: any;
  style?: string;
  platform?: 'youtube' | 'instagram';
  status?: 'pending' | 'posted' | 'failed';
}

export const TOOLS = {
  CHAT: 'chat',
  IMAGE: 'image',
  PROMPT_ENHANCER: 'prompt_enhancer',
  SOCIAL_GEN: 'social_gen',
  HISTORY: 'history',
  AUTO_POSTER: 'auto_poster',
  SONG_GEN: 'song_gen',
  VIDEO_GEN: 'video_gen'
} as const;

export type ToolType = typeof TOOLS[keyof typeof TOOLS];

export const PLAN_LIMITS = {
  free: 3,
  basic: 10,
  premium: 50,
  admin: 9999
};
