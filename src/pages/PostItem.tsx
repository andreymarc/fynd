import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Upload, X, MapPin, Loader } from 'lucide-react'
import { categories, ItemType } from '../lib/categories'

export default function PostItem() {
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
      <h1 className="text-2xl font-bold mb-6">Post a {category === 'lost' ? 'Lost' : 'Found'} Item</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow-sm p-6">
        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="lost"
                checked={category === 'lost'}
                onChange={(e) => setCategory(e.target.value as 'lost' | 'found')}
                className="mr-2"
              />
              Lost
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="found"
                checked={category === 'found'}
                onChange={(e) => setCategory(e.target.value as 'lost' | 'found')}
                className="mr-2"
              />
              Found
            </label>
          </div>
        </div>

        {/* Item Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Item Category *
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
                      ? cat.color + ' border-current'
                      : 'bg-white border-gray-200 active:border-gray-300'
                  }`}
                >
                  <Icon size={28} />
                  <span className="text-xs font-medium text-center leading-tight">{cat.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Lost iPhone 13 Pro"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe the item in detail..."
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location
            {category === 'found' && (
              <span className="text-xs text-gray-500 ml-2">(Auto-detect available)</span>
            )}
          </label>
          <div className="flex gap-2">
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={category === 'found' ? "e.g., Central Park, New York (or click detect)" : "e.g., Central Park, New York"}
            />
            <button
              type="button"
              onClick={detectLocation}
              disabled={detectingLocation}
              className="px-4 py-2.5 bg-green-600 text-white rounded-lg active:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap touch-manipulation min-h-[44px] font-medium"
              title="Detect current location"
            >
              {detectingLocation ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  <span className="hidden sm:inline">Detecting...</span>
                </>
              ) : (
                <>
                  <MapPin size={20} />
                  <span className="hidden sm:inline">Detect</span>
                </>
              )}
            </button>
          </div>
          {category === 'found' && !location && (
            <p className="mt-1 text-xs text-gray-500">
              💡 Tip: Click "Detect" to automatically fill your current location
            </p>
          )}
        </div>

        {/* Contact Info */}
        <div>
          <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">
            Contact Information
          </label>
          <input
            id="contact"
            type="text"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Phone number or email"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image
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
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">Click to upload image</p>
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
          className="w-full bg-blue-600 text-white py-4 rounded-lg active:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg touch-manipulation min-h-[52px]"
        >
          {loading ? 'Posting...' : 'Post Item'}
        </button>
      </form>
    </div>
  )
}

