import { Shield, CheckCircle } from 'lucide-react'

interface VerifiedBadgeProps {
  verified: boolean
  verificationStatus?: 'pending' | 'approved' | 'rejected'
  size?: 'sm' | 'md' | 'lg'
}

export default function VerifiedBadge({ 
  verified, 
  verificationStatus,
  size = 'md' 
}: VerifiedBadgeProps) {
  if (!verified && verificationStatus !== 'pending') {
    return null
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  }

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  }

  if (verificationStatus === 'pending') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 font-medium ${sizeClasses[size]}`}>
        <Shield size={iconSizes[size]} className="animate-pulse" />
        <span>Verification Pending</span>
      </span>
    )
  }

  if (verified) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800 font-medium ${sizeClasses[size]}`}>
        <CheckCircle size={iconSizes[size]} />
        <span>Verified</span>
      </span>
    )
  }

  return null
}

