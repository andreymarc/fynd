export interface Item {
  id: string
  title: string
  description: string
  category: 'lost' | 'found'
  item_type?: string // 'electronics', 'clothing', 'keys', etc.
  location?: string
  image_url?: string
  contact_info?: string
  user_id: string
  created_at: string
  updated_at: string
  status: 'active' | 'resolved'
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

