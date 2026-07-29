export interface AppUser {
  id: string;
  email: string;
  email_confirmed_at?: string;
  user_metadata: Record<string, unknown>;
}

export interface AppSession {
  access_token: string;
  user: AppUser;
}

export interface Profile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  birthdate?: string | null;
  bio: string;
  avatar_url?: string | null;
  search_history: string[];
  books_read: number;
  books_exchanged: number;
  library_count: number;
  wishlist_count: number;
  history_count: number;
  created_at: string;
  updated_at: string;
}

export interface LocalBook {
  id: string;
  user_id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  language: string;
  condition: string;
  price: number;
  pages?: number | null;
  isbn?: string | null;
  location?: string | null;
  images: string[];
  created_at: string;
  updated_at: string;
}

export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    averageRating?: number;
    previewLink?: string;
    pageCount?: number;
    categories?: string[];
    language?: string;
  };
  accessInfo?: {
    pdf?: { isAvailable?: boolean; downloadLink?: string };
    webReaderLink?: string;
  };
}

