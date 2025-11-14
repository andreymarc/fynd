import { 
  Smartphone, 
  Shirt, 
  Key, 
  Heart, 
  Watch, 
  Book, 
  Wallet, 
  Headphones, 
  Car, 
  Bike, 
  Gamepad2,
  MoreHorizontal
} from 'lucide-react'

export type ItemType = 
  | 'electronics'
  | 'clothing'
  | 'keys'
  | 'pets'
  | 'jewelry'
  | 'books'
  | 'wallet'
  | 'accessories'
  | 'vehicles'
  | 'sports'
  | 'toys'
  | 'other'

export interface Category {
  id: ItemType
  name: string
  icon: any
  color: string
}

export const categories: Category[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    icon: Smartphone,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    id: 'clothing',
    name: 'Clothing',
    icon: Shirt,
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    id: 'keys',
    name: 'Keys',
    icon: Key,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  {
    id: 'pets',
    name: 'Pets',
    icon: Heart,
    color: 'bg-pink-100 text-pink-800 border-pink-200'
  },
  {
    id: 'jewelry',
    name: 'Jewelry',
    icon: Watch,
    color: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    id: 'books',
    name: 'Books',
    icon: Book,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    id: 'wallet',
    name: 'Wallet/Purse',
    icon: Wallet,
    color: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    id: 'accessories',
    name: 'Accessories',
    icon: Headphones,
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  {
    id: 'vehicles',
    name: 'Vehicles',
    icon: Car,
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  },
  {
    id: 'sports',
    name: 'Sports Equipment',
    icon: Bike,
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  {
    id: 'toys',
    name: 'Toys & Games',
    icon: Gamepad2,
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  {
    id: 'other',
    name: 'Other',
    icon: MoreHorizontal,
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  }
]

export const getCategoryById = (id: ItemType): Category => {
  return categories.find(cat => cat.id === id) || categories[categories.length - 1]
}

