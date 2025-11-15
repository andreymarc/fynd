import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'

interface MatchBadgeProps {
  score: number
  reasons?: string[]
  size?: 'sm' | 'md' | 'lg'
}

export default function MatchBadge({ score, reasons = [], size = 'md' }: MatchBadgeProps) {
  const { t } = useTranslation()

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-600 dark:bg-green-500 text-white'
    if (score >= 60) return 'bg-blue-600 dark:bg-blue-500 text-white'
    if (score >= 40) return 'bg-yellow-600 dark:bg-yellow-500 text-white'
    return 'bg-orange-600 dark:bg-orange-500 text-white'
  }

  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-0.5'
      case 'lg':
        return 'text-base px-4 py-2'
      default:
        return 'text-sm px-3 py-1'
    }
  }

  const getReasonText = (reason: string) => {
    switch (reason) {
      case 'category':
        return t('matching.reasonCategory', 'Category')
      case 'keywords':
        return t('matching.reasonKeywords', 'Keywords')
      case 'location':
        return t('matching.reasonLocation', 'Location')
      case 'date':
        return t('matching.reasonDate', 'Date')
      default:
        return reason
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${getScoreColor(score)} ${getSizeClasses(size)}`}
        title={
          reasons.length > 0
            ? `${t('matching.matchScore', 'Match Score')}: ${score}% - ${reasons.map(getReasonText).join(', ')}`
            : `${t('matching.matchScore', 'Match Score')}: ${score}%`
        }
      >
        <Sparkles size={size === 'sm' ? 12 : size === 'lg' ? 18 : 14} className="flex-shrink-0" />
        <span>{score}%</span>
      </span>
    </div>
  )
}

