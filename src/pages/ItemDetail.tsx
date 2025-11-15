import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { Item, Claim } from '../types/database.types'
import { MapPin, Calendar, ArrowLeft, CheckCircle, XCircle, MessageSquare, Shield } from 'lucide-react'
import { getCategoryById, ItemType } from '../lib/categories'
import VerifiedBadge from '../components/VerifiedBadge'
import TrustIndicators from '../components/TrustIndicators'
import VerificationRequest from '../components/VerificationRequest'
import Messaging from '../components/Messaging'
import { notifyItemOwnerOfClaim, notifyClaimerOfApproval, notifyClaimerOfRejection, notifyClaimerOfResolution } from '../lib/notifications'

export default function ItemDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [claims, setClaims] = useState<Claim[]>([])
  const [claimMessage, setClaimMessage] = useState('')
  const [showClaimForm, setShowClaimForm] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [showVerificationForm, setShowVerificationForm] = useState(false)
  const [showMessaging, setShowMessaging] = useState(false)
  const [messagingWithUserId, setMessagingWithUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchItem()
    fetchUser()
    fetchClaims()

    // Real-time subscriptions disabled to avoid Supabase costs
    // To re-enable: Uncomment the code below and enable replication in Supabase dashboard
    /*
    if (!id) return

    // Set up real-time subscription for claims
    const claimsChannel = supabase
      .channel(`item-claims-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'claims',
          filter: `item_id=eq.${id}`
        },
        () => {
          // Refresh claims when any change occurs
          fetchClaims()
        }
      )
      .subscribe()

    // Set up real-time subscription for item updates
    const itemChannel = supabase
      .channel(`item-updates-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'items',
          filter: `id=eq.${id}`
        },
        (payload) => {
          const updatedItem = payload.new as Item
          setItem(updatedItem)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(claimsChannel)
      supabase.removeChannel(itemChannel)
    }
    */
  }, [id])

  const fetchItem = async () => {
    if (!id) return

    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setItem(data)
    } catch (error) {
      console.error('Error fetching item:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClaims = async () => {
    if (!id) return

    try {
      const { data, error } = await supabase
        .from('claims')
        .select('*')
        .eq('item_id', id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setClaims(data || [])
    } catch (error) {
      console.error('Error fetching claims:', error)
    }
  }

  const fetchUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)
  }

  const handleClaim = async () => {
    if (!user || !id) return

    setClaiming(true)
    try {
      const { error } = await supabase.from('claims').insert({
        item_id: id,
        claimed_by_user_id: user.id,
        message: claimMessage || null,
        status: 'pending',
      })

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation - already claimed
          alert(t('itemDetail.alreadyClaimed'))
        } else {
          throw error
        }
      } else {
        setClaimMessage('')
        setShowClaimForm(false)
        fetchClaims()
        
        // Notify item owner
        if (item) {
          await notifyItemOwnerOfClaim(
            item.user_id,
            item.id,
            item.title,
            user.email
          )
        }
        
        alert(t('itemDetail.claimSubmitted', 'Claim submitted! The owner will be notified.'))
      }
    } catch (error: any) {
      console.error('Error claiming item:', error)
      alert('Failed to claim item: ' + error.message)
    } finally {
      setClaiming(false)
    }
  }

  const handleClaimStatus = async (claimId: string, status: 'approved' | 'rejected') => {
    if (!item || !user || user.id !== item.user_id) return

    try {
      const { error } = await supabase
        .from('claims')
        .update({ status })
        .eq('id', claimId)

      if (error) throw error

      // Find the claim to get the claimer's ID
      const claim = claims.find(c => c.id === claimId)
      
      // Notify the claimer
      if (claim) {
        if (status === 'approved') {
          await notifyClaimerOfApproval(claim.claimed_by_user_id, item.id, item.title)
          // Mark item as resolved
          await supabase
            .from('items')
            .update({ status: 'resolved' })
            .eq('id', item.id)
          setItem({ ...item, status: 'resolved' })
        } else {
          await notifyClaimerOfRejection(claim.claimed_by_user_id, item.id, item.title)
        }
      }

      fetchClaims()
    } catch (error: any) {
      console.error('Error updating claim:', error)
      alert('Failed to update claim: ' + error.message)
    }
  }

  const markAsResolved = async () => {
    if (!item || !user || user.id !== item.user_id) return

    if (!confirm(t('itemDetail.confirmResolve', 'Mark this item as resolved? This will close all pending claims.'))) return

    try {
      const { error } = await supabase
        .from('items')
        .update({ status: 'resolved' })
        .eq('id', item.id)

      if (error) throw error
      
      // Notify all approved claimers
      const approvedClaims = claims.filter(c => c.status === 'approved')
      for (const claim of approvedClaims) {
        await notifyClaimerOfResolution(claim.claimed_by_user_id, item.id, item.title)
      }
      
      setItem({ ...item, status: 'resolved' })
      fetchClaims()
    } catch (error: any) {
      console.error('Error marking as resolved:', error)
      alert(t('itemDetail.resolveError', 'Failed to mark as resolved: ') + error.message)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Item not found</p>
          <Link to="/" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            Go back home
          </Link>
        </div>
      </div>
    )
  }

  const isOwner = user && user.id === item.user_id
  const hasClaimed = user && claims.some(c => c.claimed_by_user_id === user.id)
  const pendingClaims = claims.filter(c => c.status === 'pending')
  const approvedClaim = claims.find(c => c.status === 'approved')
  const canMessage = user && item.status === 'active' && (isOwner || hasClaimed)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-64 sm:h-96 object-cover"
          />
        )}

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">{item.title}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    item.category === 'lost'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  }`}
                >
                  {item.category === 'lost' ? t('home.filterLost') : t('home.filterFound')}
                </span>
                {item.item_type && (() => {
                  const cat = getCategoryById(item.item_type as ItemType)
                  const Icon = cat.icon
                  return (
                    <span className={`px-3 py-1 rounded text-sm font-medium flex items-center gap-1 ${cat.color} dark:opacity-90`}>
                      <Icon size={14} />
                      {t(`categories.${item.item_type}`)}
                    </span>
                  )
                })()}
                {item.status === 'resolved' && (
                  <span className="px-3 py-1 rounded text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 flex items-center gap-1">
                    <CheckCircle size={14} />
                    {t('itemDetail.status.resolved')}
                  </span>
                )}
                {approvedClaim && item.status === 'active' && (
                  <span className="px-3 py-1 rounded text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 flex items-center gap-1">
                    <Shield size={14} />
                    {t('itemDetail.status.claimApproved')}
                  </span>
                )}
                <VerifiedBadge 
                  verified={item.verified || false} 
                  verificationStatus={item.verification_status}
                  size="md"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <p className="text-gray-700 dark:text-gray-300 text-lg">{item.description}</p>

            {item.location && (
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <MapPin size={20} className="mr-2" />
                <span>{item.location}</span>
              </div>
            )}

            {item.contact_info && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact:</p>
                <p className="text-gray-600 dark:text-gray-400">{item.contact_info}</p>
              </div>
            )}

            <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
              <Calendar size={16} className="mr-2" />
              {t('itemDetail.postedOn')} {new Date(item.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>

          {/* Trust Indicators */}
          <TrustIndicators item={item} />

          {/* Verification Section - Owner Only */}
          {isOwner && item.status === 'active' && (
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              {item.verified ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-green-800 dark:text-green-300 font-medium flex items-center gap-2">
                    <CheckCircle size={20} />
                    {t('itemDetail.verified')}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                    {t('itemDetail.verifiedDescription')}
                  </p>
                </div>
              ) : item.verification_status === 'pending' ? (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-yellow-800 dark:text-yellow-300 font-medium">{t('itemDetail.verificationPending')}</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                    {t('itemDetail.verificationPendingDescription')}
                  </p>
                </div>
              ) : (
                <div>
                  {!showVerificationForm ? (
                    <button
                      onClick={() => setShowVerificationForm(true)}
                      className="w-full px-4 py-3 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <Shield size={20} />
                      {t('itemDetail.requestVerification')}
                    </button>
                  ) : (
                    <VerificationRequest
                      itemId={item.id}
                      onSuccess={() => {
                        setShowVerificationForm(false)
                        fetchItem()
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Claim Section */}
          {item.status === 'active' && (
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              {isOwner ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('itemDetail.claims')} ({pendingClaims.length})</h3>
                    <button
                      onClick={markAsResolved}
                      className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm"
                    >
                      {t('itemDetail.markResolved')}
                    </button>
                  </div>
                  
                  {claims.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t('itemDetail.noClaims')}</p>
                  ) : (
                    <div className="space-y-3">
                      {claims.map((claim) => (
                        <div
                          key={claim.id}
                          className={`p-4 rounded-lg border ${
                            claim.status === 'approved'
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                              : claim.status === 'rejected'
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                              : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                {claim.claimed_by?.email || `User ${claim.claimed_by_user_id.slice(0, 8)}...`}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(claim.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                claim.status === 'approved'
                                  ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-300'
                                  : claim.status === 'rejected'
                                  ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-300'
                                  : 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-300'
                              }`}
                            >
                              {claim.status}
                            </span>
                          </div>
                          {claim.message && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{claim.message}</p>
                          )}
                          {claim.status === 'pending' && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleClaimStatus(claim.id, 'approved')}
                                className="flex items-center gap-1 px-3 py-1 bg-green-600 dark:bg-green-500 text-white rounded text-sm hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                              >
                                <CheckCircle size={16} />
                                {t('common.approve')}
                              </button>
                              <button
                                onClick={() => handleClaimStatus(claim.id, 'rejected')}
                                className="flex items-center gap-1 px-3 py-1 bg-red-600 dark:bg-red-500 text-white rounded text-sm hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                              >
                                <XCircle size={16} />
                                {t('common.reject')}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : user && !hasClaimed ? (
                <div className="space-y-3">
                  {!showClaimForm ? (
                    <button
                      onClick={() => setShowClaimForm(true)}
                      className="w-full sm:w-auto px-6 py-4 bg-blue-600 dark:bg-blue-500 text-white rounded-lg active:bg-blue-700 dark:active:bg-blue-600 transition-colors font-medium flex items-center justify-center gap-2 touch-manipulation min-h-[52px]"
                    >
                      <MessageSquare size={20} />
                      {t('itemDetail.claimItem')}
                    </button>
                  ) : (
                    <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('itemDetail.claimItem')}</h3>
                      <textarea
                        value={claimMessage}
                        onChange={(e) => setClaimMessage(e.target.value)}
                        placeholder={t('itemDetail.claimMessage')}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleClaim}
                          disabled={claiming}
                          className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {claiming ? t('itemDetail.submitting') : t('itemDetail.submitClaim')}
                        </button>
                        <button
                          onClick={() => {
                            setShowClaimForm(false)
                            setClaimMessage('')
                          }}
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          {t('itemDetail.cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                  {hasClaimed && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('itemDetail.alreadyClaimed')}</p>
                  )}
                </div>
              ) : !user ? (
                <div className="text-center py-4">
                  <p className="text-gray-600 dark:text-gray-400 mb-3">{t('itemDetail.wantToClaim')}</p>
                  <Link
                    to="/login"
                    className="inline-block px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                  >
                    {t('itemDetail.loginToClaim')}
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-blue-800 dark:text-blue-300 font-medium">{t('itemDetail.youClaimed')}</p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      {t('itemDetail.waitingResponse')}
                    </p>
                  </div>
                  {!showMessaging && (
                    <button
                      onClick={() => {
                        setMessagingWithUserId(item.user_id)
                        setShowMessaging(true)
                      }}
                      className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageSquare size={20} />
                      {t('messaging.messageOwner', 'Message Owner')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Messaging Section */}
          {canMessage && showMessaging && messagingWithUserId && (
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('messaging.messages', 'Messages')}
                </h3>
                <button
                  onClick={() => {
                    setShowMessaging(false)
                    setMessagingWithUserId(null)
                  }}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {t('messaging.close', 'Close')}
                </button>
              </div>
              <Messaging
                itemId={item.id}
                itemOwnerId={item.user_id}
                currentUserId={user.id}
                otherUserId={messagingWithUserId}
                otherUserEmail={
                  isOwner
                    ? claims.find(c => c.claimed_by_user_id === messagingWithUserId)?.claimed_by?.email
                    : undefined
                }
              />
            </div>
          )}

          {isOwner && item.status === 'resolved' && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('itemDetail.resolved')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

