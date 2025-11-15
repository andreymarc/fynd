import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { Match, Item } from '../types/database.types'
import MatchBadge from './MatchBadge'
import { MapPin, Calendar, ExternalLink, X } from 'lucide-react'
import { getCategoryById, ItemType } from '../lib/categories'

interface MatchListProps {
  itemId: string
  itemCategory: 'lost' | 'found'
}

export default function MatchList({ itemId, itemCategory }: MatchListProps) {
  const { t, i18n } = useTranslation()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMatches()
  }, [itemId])

  const fetchMatches = async () => {
    try {
      let query = supabase
        .from('matches')
        .select(`
          *,
          lost_item:items!matches_lost_item_id_fkey(*),
          found_item:items!matches_found_item_id_fkey(*)
        `)
        .order('match_score', { ascending: false })
        .limit(10)

      if (itemCategory === 'lost') {
        query = query.eq('lost_item_id', itemId)
      } else {
        query = query.eq('found_item_id', itemId)
      }

      const { data, error } = await query

      if (error) throw error

      setMatches((data || []).filter(m => m.status !== 'dismissed'))
      setLoading(false)
    } catch (error) {
      console.error('Error fetching matches:', error)
      setLoading(false)
    }
  }

  const updateMatchStatus = async (matchId: string, status: 'viewed' | 'contacted' | 'dismissed') => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ status })
        .eq('id', matchId)

      if (error) throw error

      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status } : m))
    } catch (error) {
      console.error('Error updating match status:', error)
    }
  }

  const getMatchItem = (match: Match): Item | null => {
    if (itemCategory === 'lost') {
      return match.found_item as Item
    } else {
      return match.lost_item as Item
    }
  }

  const getMatchItemId = (match: Match): string => {
    if (itemCategory === 'lost') {
      return match.found_item_id
    } else {
      return match.lost_item_id
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        {t('matching.loading', 'Loading matches...')}
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        {t('matching.noMatches', 'No potential matches found yet.')}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('matching.possibleMatches', 'Possible Matches')} ({matches.length})
        </h3>
      </div>

      {matches.map((match) => {
        const matchItem = getMatchItem(match)
        if (!matchItem) return null

        const category = matchItem.item_type ? getCategoryById(matchItem.item_type as ItemType) : null
        const CategoryIcon = category?.icon || MapPin

        return (
          <div
            key={match.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MatchBadge score={Math.round(match.match_score)} reasons={match.match_reasons} size="sm" />
                  <Link
                    to={`/item/${getMatchItemId(match)}`}
                    onClick={() => updateMatchStatus(match.id, 'viewed')}
                    className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {matchItem.title}
                  </Link>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                  {matchItem.description}
                </p>

                <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                  {matchItem.location && (
                    <div className="flex items-center gap-1">
                      <MapPin size={12} />
                      <span>{matchItem.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>
                      {new Date(matchItem.created_at).toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US')}
                    </span>
                  </div>
                  {matchItem.item_type && category && (
                    <div className="flex items-center gap-1">
                      <CategoryIcon size={12} />
                      <span>{t(`categories.${matchItem.item_type}`)}</span>
                    </div>
                  )}
                </div>

                {match.match_reasons && match.match_reasons.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {match.match_reasons.map((reason) => (
                      <span
                        key={reason}
                        className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs"
                      >
                        {reason === 'category' && t('matching.reasonCategory', 'Category')}
                        {reason === 'keywords' && t('matching.reasonKeywords', 'Keywords')}
                        {reason === 'location' && t('matching.reasonLocation', 'Location')}
                        {reason === 'date' && t('matching.reasonDate', 'Date')}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Link
                  to={`/item/${getMatchItemId(match)}`}
                  onClick={() => updateMatchStatus(match.id, 'viewed')}
                  className="px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm flex items-center gap-1"
                >
                  <ExternalLink size={14} />
                  {t('matching.viewItem', 'View')}
                </Link>
                <button
                  onClick={() => updateMatchStatus(match.id, 'dismissed')}
                  className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors text-sm flex items-center gap-1"
                  title={t('matching.dismiss', 'Dismiss')}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

