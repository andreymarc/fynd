import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { Item } from '../types/database.types'
import { Search, MapPin, CheckCircle, RefreshCw, Map, List, Heart, Share2, Clock, Navigation } from 'lucide-react'
import { categories, ItemType, getCategoryById } from '../lib/categories'
import VerifiedBadge from '../components/VerifiedBadge'
import MatchBadge from '../components/MatchBadge'
import MapView from '../components/MapView'
import { calculateDistance, formatDistance, getTimeAgo, shareItem } from '../lib/utils'

export default function Home() {
  const { t, i18n } = useTranslation()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'lost' | 'found'>('all')
  const [itemTypeFilter, setItemTypeFilter] = useState<ItemType | 'all'>('all')
  const [claimCounts, setClaimCounts] = useState<Record<string, number>>({})
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [matchScores, setMatchScores] = useState<Record<string, { score: number; reasons: string[] }>>({})
  // Real-time notification state (disabled to avoid costs)
  // const [newItemsCount, setNewItemsCount] = useState(0)
  // const [showNewItemsNotification, setShowNewItemsNotification] = useState(false)
  const lastItemIdRef = useRef<string | null>(null)

  const loadFavorites = () => {
    const saved = localStorage.getItem('fynd_favorites')
    if (saved) {
      try {
        setFavorites(new Set(JSON.parse(saved)))
      } catch (e) {
        console.error('Error loading favorites:', e)
      }
    }
  }

  const toggleFavorite = (itemId: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(itemId)) {
      newFavorites.delete(itemId)
    } else {
      newFavorites.add(itemId)
    }
    setFavorites(newFavorites)
    localStorage.setItem('fynd_favorites', JSON.stringify(Array.from(newFavorites)))
  }

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          })
        },
        () => {
          // User denied or error - that's okay
        }
      )
    }
  }

  const getItemDistance = (item: Item): number | null => {
    if (!userLocation || !item.latitude || !item.longitude) return null
    return calculateDistance(userLocation.lat, userLocation.lon, item.latitude, item.longitude)
  }

  useEffect(() => {
    fetchItems()
    loadFavorites()
    getUserLocation()
    
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

  const fetchMatchScores = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const itemIds = items.map(item => item.id)
      if (itemIds.length === 0) return

      // Get matches where user's items are involved
      const { data, error } = await supabase
        .from('matches')
        .select('lost_item_id, found_item_id, match_score, match_reasons')
        .or(`lost_item_id.in.(${itemIds.join(',')}),found_item_id.in.(${itemIds.join(',')})`)
        .gte('match_score', 30)
        .order('match_score', { ascending: false })

      if (error) throw error

      const scores: Record<string, { score: number; reasons: string[] }> = {}
      data?.forEach(match => {
        // Store match score for both items
        if (itemIds.includes(match.lost_item_id)) {
          scores[match.lost_item_id] = {
            score: match.match_score,
            reasons: match.match_reasons || []
          }
        }
        if (itemIds.includes(match.found_item_id)) {
          scores[match.found_item_id] = {
            score: match.match_score,
            reasons: match.match_reasons || []
          }
        }
      })
      setMatchScores(scores)
    } catch (error) {
      console.error('Error fetching match scores:', error)
    }
  }

  useEffect(() => {
    if (items.length > 0) {
      fetchClaimCounts()
      fetchMatchScores()
    }
  }, [items])

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
      {/* View Toggle and Refresh Button */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2 ${
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <List size={16} />
            <span className="hidden sm:inline">{t('home.listView', 'List')}</span>
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2 ${
              viewMode === 'map'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Map size={16} />
            <span className="hidden sm:inline">{t('home.mapView', 'Map')}</span>
          </button>
        </div>
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

      {/* Map View or List View */}
      {viewMode === 'map' ? (
        <MapView
          items={items}
          filter={filter}
          itemTypeFilter={itemTypeFilter}
          searchTerm={searchTerm}
        />
      ) : (
        <>
          {/* Items Grid */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 text-lg">{t('home.noItems')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const distance = getItemDistance(item)
                const isFavorite = favorites.has(item.id)
                const cat = item.item_type ? getCategoryById(item.item_type as ItemType) : null
                const CategoryIcon = cat?.icon || MapPin
                
                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 overflow-hidden group"
                  >
                    <Link to={`/item/${item.id}`} className="block">
                      {item.image_url && (
                        <div className="relative w-full h-48 overflow-hidden">
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute top-2 right-2 flex gap-2 flex-wrap justify-end">
                            {matchScores[item.id] && matchScores[item.id].score >= 50 && (
                              <MatchBadge 
                                score={Math.round(matchScores[item.id].score)} 
                                reasons={matchScores[item.id].reasons}
                                size="sm"
                              />
                            )}
                            <VerifiedBadge 
                              verified={item.verified || false} 
                              verificationStatus={item.verification_status}
                              size="sm"
                            />
                            {claimCounts[item.id] > 0 && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-600 dark:bg-blue-500 text-white flex items-center gap-1 shadow-lg">
                                <CheckCircle size={12} />
                                {claimCounts[item.id]}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-lg line-clamp-2 flex-1 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {item.title}
                          </h3>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                              item.category === 'lost'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            }`}
                          >
                            {item.category === 'lost' ? t('home.filterLost') : t('home.filterFound')}
                          </span>
                          {item.item_type && cat && (
                            <span className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${cat.color} dark:opacity-90`}>
                              <CategoryIcon size={12} />
                              {t(`categories.${item.item_type}`)}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">{item.description}</p>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex flex-col gap-1.5">
                            {item.location && (
                              <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs">
                                <MapPin size={14} className="mr-1.5 flex-shrink-0" />
                                <span className="truncate">{item.location}</span>
                              </div>
                            )}
                            {distance !== null && (
                              <div className="flex items-center text-blue-600 dark:text-blue-400 text-xs font-medium">
                                <Navigation size={14} className="mr-1.5 flex-shrink-0" />
                                <span>{formatDistance(distance)} {t('home.away', 'away')}</span>
                              </div>
                            )}
                            <div className="flex items-center text-gray-400 dark:text-gray-500 text-xs">
                              <Clock size={14} className="mr-1.5 flex-shrink-0" />
                              <span>{getTimeAgo(item.created_at, i18n.language)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                    
                    {/* Quick Actions */}
                    <div className="px-4 pb-4 flex items-center gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleFavorite(item.id)
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          isFavorite
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title={isFavorite ? t('home.removeFavorite', 'Remove from favorites') : t('home.addFavorite', 'Add to favorites')}
                      >
                        <Heart size={14} className={isFavorite ? 'fill-current' : ''} />
                        <span className="hidden sm:inline">{isFavorite ? t('home.favorited', 'Saved') : t('home.favorite', 'Save')}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          shareItem(item.id, item.title)
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title={t('home.share', 'Share item')}
                      >
                        <Share2 size={14} />
                        <span className="hidden sm:inline">{t('home.share', 'Share')}</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

