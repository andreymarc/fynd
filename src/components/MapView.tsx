import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { Icon } from 'leaflet'
import { Item } from '../types/database.types'
import { MapPin, Calendar } from 'lucide-react'
import { getCategoryById, ItemType } from '../lib/categories'
import VerifiedBadge from './VerifiedBadge'
import { useTranslation } from 'react-i18next'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in React-Leaflet
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = new Icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

// Custom marker icons for lost/found
const lostIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
      <path fill="#ef4444" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.5 12.5 28.5 12.5 28.5S25 21 25 12.5C25 5.6 19.4 0 12.5 0z"/>
      <circle fill="white" cx="12.5" cy="12.5" r="5"/>
    </svg>
  `),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
})

const foundIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
      <path fill="#22c55e" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.5 12.5 28.5 12.5 28.5S25 21 25 12.5C25 5.6 19.4 0 12.5 0z"/>
      <circle fill="white" cx="12.5" cy="12.5" r="5"/>
    </svg>
  `),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
})

interface MapViewProps {
  items: Item[]
  filter: 'all' | 'lost' | 'found'
  itemTypeFilter: ItemType | 'all'
  searchTerm: string
}

// Component to handle map bounds updates
function MapBoundsUpdater({ items }: { items: Item[] }) {
  const map = useMap()
  
  useEffect(() => {
    if (items.length > 0) {
      const bounds = items
        .filter(item => item.latitude && item.longitude)
        .map(item => [item.latitude!, item.longitude!] as [number, number])
      
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }
  }, [items, map])
  
  return null
}

export default function MapView({ items, filter, itemTypeFilter, searchTerm }: MapViewProps) {
  const { t, i18n } = useTranslation()
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([31.7683, 35.2137]) // Default to Jerusalem, Israel

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation([latitude, longitude])
          setMapCenter([latitude, longitude])
        },
        () => {
          // If geolocation fails, use default center
          console.log('Geolocation not available, using default center')
        }
      )
    }
  }, [])

  // Filter items based on search, filter, and itemTypeFilter
  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filter === 'all' || item.category === filter
    const matchesTypeFilter = itemTypeFilter === 'all' || item.item_type === itemTypeFilter
    const hasLocation = item.latitude && item.longitude
    
    return matchesSearch && matchesFilter && matchesTypeFilter && hasLocation
  })

  return (
    <div className="w-full h-[calc(100vh-8rem)] relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <MapContainer
        center={mapCenter}
        zoom={10}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBoundsUpdater items={filteredItems} />
        
        {filteredItems.map((item) => {
          if (!item.latitude || !item.longitude) return null
          
          const cat = item.item_type ? getCategoryById(item.item_type as ItemType) : null
          const Icon = cat?.icon || MapPin
          
          return (
            <Marker
              key={item.id}
              position={[item.latitude, item.longitude]}
              icon={item.category === 'lost' ? lostIcon : foundIcon}
            >
              <Popup className="map-popup">
                <Link to={`/item/${item.id}`} className="block">
                  <div className="min-w-[200px] sm:min-w-[250px]">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-32 object-cover rounded-t-lg mb-2"
                      />
                    )}
                    <div className="p-2">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm line-clamp-1">
                          {item.title}
                        </h3>
                        <VerifiedBadge
                          verified={item.verified || false}
                          verificationStatus={item.verification_status}
                          size="sm"
                        />
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-1 flex-wrap mb-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            item.category === 'lost'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          }`}
                        >
                          {item.category === 'lost' ? t('home.filterLost') : t('home.filterFound')}
                        </span>
                        {item.item_type && cat && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${cat.color} dark:opacity-90`}>
                            <Icon size={10} />
                            {t(`categories.${item.item_type}`)}
                          </span>
                        )}
                      </div>
                      {item.location && (
                        <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs mb-1">
                          <MapPin size={12} className="mr-1" />
                          <span className="line-clamp-1">{item.location}</span>
                        </div>
                      )}
                      <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs">
                        <Calendar size={12} className="mr-1" />
                        <span>
                          {new Date(item.created_at).toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </Popup>
            </Marker>
          )
        })}
        
        {userLocation && (
          <Marker
            position={userLocation}
            icon={new Icon({
              iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
                  <circle fill="#3b82f6" cx="10" cy="10" r="8"/>
                  <circle fill="white" cx="10" cy="10" r="3"/>
                </svg>
              `),
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })}
          >
            <Popup>{t('map.yourLocation', 'Your Location')}</Popup>
          </Marker>
        )}
      </MapContainer>
      
      {filteredItems.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 bg-opacity-90 dark:bg-opacity-90 z-[1000]">
          <div className="text-center">
            <MapPin className="mx-auto text-gray-400 dark:text-gray-600 mb-2" size={48} />
            <p className="text-gray-500 dark:text-gray-400">{t('map.noItemsWithLocation', 'No items with location data found')}</p>
          </div>
        </div>
      )}
    </div>
  )
}

