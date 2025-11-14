import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { Upload, X, MapPin, Loader } from 'lucide-react'
import { categories, ItemType } from '../lib/categories'

export default function PostItem() {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<'lost' | 'found'>('lost')
  const [itemType, setItemType] = useState<ItemType>('other')
  const [location, setLocation] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const navigate = useNavigate()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
      )
      const data = await response.json()
      
      if (data.address) {
        const address = data.address
        // Build a readable address from components
        const parts = []
        if (address.road) parts.push(address.road)
        if (address.house_number) parts.push(address.house_number)
        if (address.suburb || address.neighbourhood) parts.push(address.suburb || address.neighbourhood)
        if (address.city || address.town || address.village) parts.push(address.city || address.town || address.village)
        if (address.state) parts.push(address.state)
        
        return parts.length > 0 ? parts.join(', ') : data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`
      }
      
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      // Fallback to coordinates if reverse geocoding fails
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`
    }
  }

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setDetectingLocation(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const address = await reverseGeocode(latitude, longitude)
          setLocation(address)
        } catch (error: any) {
          setError('Failed to get location address: ' + error.message)
        } finally {
          setDetectingLocation(false)
        }
      },
      (error) => {
        let errorMessage = 'Failed to detect location: '
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location access denied. Please enable location permissions.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information unavailable.'
            break
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.'
            break
          default:
            errorMessage += 'An unknown error occurred.'
            break
        }
        setError(errorMessage)
        setDetectingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  // Auto-detect location when switching to "found" category
  useEffect(() => {
    if (category === 'found' && !location && !detectingLocation) {
      // Only suggest, don't auto-detect automatically (better UX)
      // User can click the button if they want
    }
  }, [category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('You must be logged in')

      let imageUrl: string | undefined

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `items/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(filePath, imageFile)

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from('item-images').getPublicUrl(filePath)
        imageUrl = publicUrl
      }

      // Insert item
      const { error: insertError } = await supabase.from('items').insert({
        title,
        description,
        category,
        item_type: itemType,
        location: location || null,
        contact_info: contactInfo || null,
        image_url: imageUrl || null,
        user_id: user.id,
        status: 'active',
      })

      if (insertError) throw insertError

      navigate('/')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">{t('postItem.title', { type: category === 'lost' ? t('postItem.lost') : t('postItem.found') })}</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('postItem.type')}
          </label>
          <div className="flex gap-4">
            <label className="flex items-center text-gray-900 dark:text-gray-100">
              <input
                type="radio"
                value="lost"
                checked={category === 'lost'}
                onChange={(e) => setCategory(e.target.value as 'lost' | 'found')}
                className="mr-2"
              />
              {t('postItem.lost')}
            </label>
            <label className="flex items-center text-gray-900 dark:text-gray-100">
              <input
                type="radio"
                value="found"
                checked={category === 'found'}
                onChange={(e) => setCategory(e.target.value as 'lost' | 'found')}
                className="mr-2"
              />
              {t('postItem.found')}
            </label>
          </div>
        </div>

        {/* Item Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('postItem.itemCategory')} *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setItemType(cat.id)}
                  className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 touch-manipulation min-h-[80px] active:scale-95 ${
                    itemType === cat.id
                      ? cat.color + ' border-current dark:border-opacity-80'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 active:border-gray-300 dark:active:border-gray-500'
                  }`}
                >
                  <Icon size={28} className={itemType === cat.id ? '' : 'text-gray-700 dark:text-gray-300'} />
                  <span className={`text-xs font-medium text-center leading-tight ${itemType === cat.id ? '' : 'text-gray-700 dark:text-gray-300'}`}>{t(`categories.${cat.id}`)}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('postItem.titleLabel')} *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            placeholder={t('postItem.titlePlaceholder')}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('postItem.description')} *
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            placeholder={t('postItem.descriptionPlaceholder')}
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('postItem.location')}
            {category === 'found' && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{t('postItem.locationHint')}</span>
            )}
          </label>
          <div className="flex gap-2">
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              placeholder={category === 'found' ? t('postItem.locationDetectPlaceholder') : t('postItem.locationPlaceholder')}
            />
            <button
              type="button"
              onClick={detectLocation}
              disabled={detectingLocation}
              className="px-4 py-2.5 bg-green-600 dark:bg-green-500 text-white rounded-lg active:bg-green-700 dark:active:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap touch-manipulation min-h-[44px] font-medium"
              title={t('postItem.detect')}
            >
              {detectingLocation ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  <span className="hidden sm:inline">{t('postItem.detecting')}</span>
                </>
              ) : (
                <>
                  <MapPin size={20} />
                  <span className="hidden sm:inline">{t('postItem.detect')}</span>
                </>
              )}
            </button>
          </div>
          {category === 'found' && !location && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('postItem.locationTip')}
            </p>
          )}
        </div>

        {/* Contact Info */}
        <div>
          <label htmlFor="contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('postItem.contact')}
          </label>
          <input
            id="contact"
            type="text"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            placeholder={t('postItem.contactPlaceholder')}
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('postItem.image')}
          </label>
          {imagePreview ? (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-w-md h-64 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null)
                  setImagePreview(null)
                }}
                className="absolute top-2 right-2 bg-red-500 dark:bg-red-600 text-white rounded-full p-1 hover:bg-red-600 dark:hover:bg-red-700"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-gray-400 dark:text-gray-500" />
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('postItem.uploadImage')}</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-lg active:bg-blue-700 dark:active:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg touch-manipulation min-h-[52px]"
        >
          {loading ? t('postItem.posting') : t('postItem.postItem')}
        </button>
      </form>
    </div>
  )
}

