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
      <span className={`inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200 font-medium ${sizeClasses[size]}`}>
        <Shield size={iconSizes[size]} className="animate-pulse" />
        <span>Verification Pending</span>
      </span>
    )
  }

  if (verified) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 border border-green-200 font-medium ${sizeClasses[size]}`}>
        <CheckCircle size={iconSizes[size]} />
        <span>Verified</span>
      </span>
    )
  }

  return null
}

