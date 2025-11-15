import { useState, useEffect, useRef } from 'react'
import { MapPin, Loader } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface LocationSuggestion {
  display_name: string
  lat: string
  lon: string
}

interface LocationAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (location: string, latitude: number, longitude: number) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  disabled,
  className = ''
}: LocationAutocompleteProps) {
  const { i18n } = useTranslation()
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // Fetch location suggestions from Nominatim API
  const fetchSuggestions = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=${i18n.language}`,
        {
          headers: {
            'User-Agent': 'FyndApp/1.0'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions')
      }

      const data = await response.json()
      setSuggestions(data)
      setShowSuggestions(data.length > 0)
      setSelectedIndex(-1)
    } catch (error) {
      console.error('Error fetching location suggestions:', error)
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 300) // Wait 300ms after user stops typing

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, i18n.language])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setShowSuggestions(true)
  }

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    onChange(suggestion.display_name)
    setShowSuggestions(false)
    setSuggestions([])
    
    if (onSelect) {
      onSelect(
        suggestion.display_name,
        parseFloat(suggestion.lat),
        parseFloat(suggestion.lon)
      )
    }
    
    inputRef.current?.blur()
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        inputRef.current?.blur()
        break
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          disabled={disabled}
          placeholder={placeholder}
          className={className}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader className="animate-spin text-gray-400" size={20} />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          dir={i18n.language === 'he' ? 'rtl' : 'ltr'}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.lat}-${suggestion.lon}-${index}`}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-start gap-3 ${
                index === selectedIndex
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : ''
              }`}
            >
              <MapPin 
                className={`mt-0.5 flex-shrink-0 ${
                  index === selectedIndex
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
                size={18}
              />
              <span className={`text-sm flex-1 ${
                index === selectedIndex
                  ? 'text-blue-900 dark:text-blue-100 font-medium'
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                {suggestion.display_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

