/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return Math.round(distance * 10) / 10 // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Format distance for display
 */
export function formatDistance(distance: number, unit: 'km' | 'mi' = 'km'): string {
  if (unit === 'mi') {
    const miles = distance * 0.621371
    return miles < 1 ? `${Math.round(miles * 10) / 10} mi` : `${Math.round(miles)} mi`
  }
  return distance < 1 ? `${distance} km` : `${Math.round(distance)} km`
}

/**
 * Get time ago string (e.g., "2 days ago", "3 hours ago")
 */
export function getTimeAgo(date: Date | string, lang: string = 'en'): string {
  const now = new Date()
  const past = typeof date === 'string' ? new Date(date) : date
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)
  
  const intervals: { [key: string]: number } = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  }
  
  for (const [unit, seconds] of Object.entries(intervals)) {
    const interval = Math.floor(diffInSeconds / seconds)
    if (interval >= 1) {
      if (lang === 'he') {
        const hebrewUnits: { [key: string]: string } = {
          year: 'שנה',
          month: 'חודש',
          week: 'שבוע',
          day: 'יום',
          hour: 'שעה',
          minute: 'דקה',
        }
        return `לפני ${interval} ${hebrewUnits[unit]}${interval > 1 ? 'ים' : ''}`
      }
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`
    }
  }
  
  return lang === 'he' ? 'לפני רגע' : 'Just now'
}

/**
 * Share item functionality
 */
export function shareItem(itemId: string, title: string): void {
  const url = `${window.location.origin}/item/${itemId}`
  const text = `Check out this ${title} on Fynd`
  
  if (navigator.share) {
    navigator.share({
      title: title,
      text: text,
      url: url,
    }).catch((err) => {
      console.log('Error sharing:', err)
      copyToClipboard(url)
    })
  } else {
    copyToClipboard(url)
  }
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).then(() => {
    // You might want to show a toast notification here
    console.log('Copied to clipboard:', text)
  })
}

