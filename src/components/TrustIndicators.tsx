import { Shield, Star, Clock, CheckCircle } from 'lucide-react'
import { Item } from '../types/database.types'

interface TrustIndicatorsProps {
  item: Item
  userItemsCount?: number
  userVerifiedItemsCount?: number
}

export default function TrustIndicators({ 
  item, 
  userItemsCount = 0,
  userVerifiedItemsCount = 0 
}: TrustIndicatorsProps) {
  const indicators = []

  // Verified item indicator
  if (item.verified) {
    indicators.push({
      icon: Shield,
      label: 'Verified Item',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      description: 'This item has been verified with additional photos'
    })
  }

  // Account age indicator (if we had user creation date)
  // For now, we'll use item count as a proxy
  if (userItemsCount >= 5) {
    indicators.push({
      icon: Star,
      label: 'Active User',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      description: 'User has posted multiple items'
    })
  }

  // Verification rate indicator
  if (userItemsCount > 0 && userVerifiedItemsCount > 0) {
    const verificationRate = (userVerifiedItemsCount / userItemsCount) * 100
    if (verificationRate >= 50) {
      indicators.push({
        icon: CheckCircle,
        label: 'High Verification Rate',
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        description: `${Math.round(verificationRate)}% of user's items are verified`
      })
    }
  }

  // Recent activity indicator
  const daysSincePost = Math.floor(
    (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSincePost <= 7) {
    indicators.push({
      icon: Clock,
      label: 'Recently Posted',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      description: `Posted ${daysSincePost === 0 ? 'today' : `${daysSincePost} day${daysSincePost > 1 ? 's' : ''} ago`}`
    })
  }

  if (indicators.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Trust Indicators</h4>
      <div className="space-y-2">
        {indicators.map((indicator, index) => {
          const Icon = indicator.icon
          return (
            <div
              key={index}
              className={`flex items-start gap-2 p-2 rounded-lg ${indicator.bgColor}`}
            >
              <Icon size={18} className={`mt-0.5 ${indicator.color}`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${indicator.color}`}>
                  {indicator.label}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {indicator.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

