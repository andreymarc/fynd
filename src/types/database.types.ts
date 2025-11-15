export interface Item {
  id: string
  title: string
  description: string
  category: 'lost' | 'found'
  item_type?: string // 'electronics', 'clothing', 'keys', etc.
  location?: string
  latitude?: number
  longitude?: number
  image_url?: string
  contact_info?: string
  user_id: string
  created_at: string
  updated_at: string
  status: 'active' | 'resolved'
  verified: boolean
  verification_status?: 'pending' | 'approved' | 'rejected'
  verification_photos?: string[]
  claims?: Claim[]
}

export interface Claim {
  id: string
  item_id: string
  claimed_by_user_id: string
  status: 'pending' | 'approved' | 'rejected'
  message?: string
  created_at: string
  updated_at: string
  claimed_by?: {
    email: string
    full_name?: string
  }
}

export interface User {
  id: string
  email: string
  full_name?: string
}

export interface Profile {
  id: string
  email?: string
  full_name?: string
  avatar_url?: string
  bio?: string
  phone?: string
  location?: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'claim' | 'claim_approved' | 'claim_rejected' | 'message' | 'item_resolved' | 'verification_approved' | 'verification_rejected'
  title: string
  message: string
  link?: string
  read: boolean
  created_at: string
}

export interface Match {
  id: string
  lost_item_id: string
  found_item_id: string
  match_score: number
  match_reasons: string[]
  status: 'pending' | 'viewed' | 'contacted' | 'dismissed'
  created_at: string
  updated_at: string
  lost_item?: Item
  found_item?: Item
}

export interface Verification {
  id: string
  item_id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  verification_photos: string[]
  verification_notes?: string
  verified_by?: string
  verified_at?: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  item_id: string
  sender_id: string
  receiver_id: string
  message: string
  read: boolean
  created_at: string
  updated_at: string
  sender?: {
    email: string
    full_name?: string
  }
  receiver?: {
    email: string
    full_name?: string
  }
}

