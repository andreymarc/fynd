import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { Item } from '../types/database.types'
import { Search, MapPin, Calendar, CheckCircle, RefreshCw } from 'lucide-react'
import { categories, ItemType, getCategoryById } from '../lib/categories'
import VerifiedBadge from '../components/VerifiedBadge'

export default function Home() {
  const { t } = useTranslation()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'lost' | 'found'>('all')
  const [itemTypeFilter, setItemTypeFilter] = useState<ItemType | 'all'>('all')
  const [claimCounts, setClaimCounts] = useState<Record<string, number>>({})
  // Real-time notification state (disabled to avoid costs)
  // const [newItemsCount, setNewItemsCount] = useState(0)
  // const [showNewItemsNotification, setShowNewItemsNotification] = useState(false)
  const lastItemIdRef = useRef<string | null>(null)

  useEffect(() => {
    fetchItems()
    
    // Real-time subscriptions disabled to avoid Supabase costs
    // To re-enable: Uncomment the code below and enable replication in Supabase dashboard
    /*
    // Set up real-time subscription for new items
    const channel = supabase
      .channel('items-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'items',
          filter: `status=eq.active`
        },
        (payload) => {
          const newItem = payload.new as Item
          
          // Check if item matches current filters
          const matchesFilter = filter === 'all' || newItem.category === filter
          const matchesTypeFilter = itemTypeFilter === 'all' || newItem.item_type === itemTypeFilter
          
          if (matchesFilter && matchesTypeFilter) {
            // Add new item to the top of the list
            setItems(prev => {
              // Check if item already exists (prevent duplicates)
              if (prev.some(item => item.id === newItem.id)) {
                return prev
              }
              return [newItem, ...prev]
            })
            
            // Show notification
            setNewItemsCount(prev => prev + 1)
            setShowNewItemsNotification(true)
            
            // Auto-hide notification after 5 seconds
            setTimeout(() => {
              setShowNewItemsNotification(false)
            }, 5000)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'items'
        },
        (payload) => {
          const updatedItem = payload.new as Item
          
          // Update item in the list if it exists
          setItems(prev => 
            prev.map(item => item.id === updatedItem.id ? updatedItem : item)
          )
          
          // If item status changed to resolved, remove it
          if (updatedItem.status === 'resolved') {
            setItems(prev => prev.filter(item => item.id !== updatedItem.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    */
  }, [filter, itemTypeFilter])

  useEffect(() => {
    if (items.length > 0) {
      fetchClaimCounts()
      // Track the most recent item ID
      if (!lastItemIdRef.current && items.length > 0) {
        lastItemIdRef.current = items[0].id
      }
    }
  }, [items])

  const fetchItems = async () => {
    try {
      let query = supabase
        .from('items')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50)

      if (filter !== 'all') {
        query = query.eq('category', filter)
      }

      if (itemTypeFilter !== 'all') {
        query = query.eq('item_type', itemTypeFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setItems(data || [])
      
      // Track the most recent item ID after initial load (for future real-time use)
      if (data && data.length > 0 && !lastItemIdRef.current) {
        lastItemIdRef.current = data[0].id
      }
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClaimCounts = async () => {
    try {
      const itemIds = items.map(item => item.id)
      const { data, error } = await supabase
        .from('claims')
        .select('item_id, status')
        .in('item_id', itemIds)
        .eq('status', 'pending')

      if (error) throw error

      const counts: Record<string, number> = {}
      data?.forEach(claim => {
        counts[claim.item_id] = (counts[claim.item_id] || 0) + 1
      })
      setClaimCounts(counts)
    } catch (error) {
      console.error('Error fetching claim counts:', error)
    }
  }

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center text-gray-900 dark:text-gray-100">Loading items...</div>
      </div>
    )
  }

  const handleRefresh = () => {
    // Reset the last item ID
    if (items.length > 0) {
      lastItemIdRef.current = items[0].id
    }
    fetchItems()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      {/* Manual Refresh Button - Real-time disabled to avoid Supabase costs */}
      <div className="mb-4 flex justify-end">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-2"
            title={t('home.refreshItems')}
          >
            <RefreshCw size={16} />
            {t('home.refreshItems')}
          </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
          <input
            type="text"
            placeholder={t('home.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        <div className="space-y-3">
          {/* Lost/Found Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2.5 rounded-lg transition-colors font-medium touch-manipulation min-h-[44px] ${
              filter === 'all'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {t('home.filterAll')}
          </button>
          <button
            onClick={() => setFilter('lost')}
            className={`px-4 py-2.5 rounded-lg transition-colors font-medium touch-manipulation min-h-[44px] ${
              filter === 'lost'
                ? 'bg-red-600 dark:bg-red-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {t('home.filterLost')}
          </button>
          <button
            onClick={() => setFilter('found')}
            className={`px-4 py-2.5 rounded-lg transition-colors font-medium touch-manipulation min-h-[44px] ${
              filter === 'found'
                ? 'bg-green-600 dark:bg-green-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {t('home.filterFound')}
          </button>
        </div>

          {/* Item Type Filter */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('home.filterCategory')}</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setItemTypeFilter('all')}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                  itemTypeFilter === 'all'
                    ? 'bg-blue-600 dark:bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {t('home.allCategories')}
              </button>
              {categories.map((cat) => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.id}
                    onClick={() => setItemTypeFilter(cat.id)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 touch-manipulation min-h-[44px] ${
                      itemTypeFilter === cat.id
                        ? cat.color + ' border-2 border-current dark:border-opacity-80'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-50 dark:active:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="whitespace-nowrap">{cat.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">{t('home.noItems')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Link
              key={item.id}
              to={`/item/${item.id}`}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-200 dark:border-gray-700"
            >
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-48 object-cover rounded-lg mb-3"
                />
              )}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-lg line-clamp-2 flex-1 text-gray-900 dark:text-gray-100">{item.title}</h3>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                        item.category === 'lost'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      }`}
                    >
                      {item.category}
                    </span>
                    {claimCounts[item.id] > 0 && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 flex items-center gap-1">
                        <CheckCircle size={12} />
                        {claimCounts[item.id]} claim{claimCounts[item.id] > 1 ? 's' : ''}
                      </span>
                    )}
                    <VerifiedBadge 
                      verified={item.verified || false} 
                      verificationStatus={item.verification_status}
                      size="sm"
                    />
                  </div>
                </div>
                {item.item_type && (
                  <div className="flex items-center gap-1">
                    {(() => {
                      const cat = getCategoryById(item.item_type as ItemType)
                      const Icon = cat.icon
                      return (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${cat.color} dark:opacity-90`}>
                          <Icon size={12} />
                          {cat.name}
                        </span>
                      )
                    })()}
                  </div>
                )}
                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">{item.description}</p>
                {item.location && (
                  <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                    <MapPin size={16} className="mr-1" />
                    <span className="truncate">{item.location}</span>
                  </div>
                )}
                <div className="flex items-center text-gray-400 dark:text-gray-500 text-xs">
                  <Calendar size={14} className="mr-1" />
                  {new Date(item.created_at).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

