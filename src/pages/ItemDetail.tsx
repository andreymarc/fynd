import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Item, Claim } from '../types/database.types'
import { MapPin, Calendar, ArrowLeft, CheckCircle, XCircle, MessageSquare, Shield } from 'lucide-react'
import { getCategoryById, ItemType } from '../lib/categories'
import VerifiedBadge from '../components/VerifiedBadge'
import TrustIndicators from '../components/TrustIndicators'
import VerificationRequest from '../components/VerificationRequest'

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [claims, setClaims] = useState<Claim[]>([])
  const [claimMessage, setClaimMessage] = useState('')
  const [showClaimForm, setShowClaimForm] = useState(false)
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    fetchItem()
    fetchUser()
    fetchClaims()
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
          alert('You have already claimed this item')
        } else {
          throw error
        }
      } else {
        setClaimMessage('')
        setShowClaimForm(false)
        fetchClaims()
        alert('Claim submitted! The owner will be notified.')
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

      if (status === 'approved') {
        // Mark item as resolved
        await supabase
          .from('items')
          .update({ status: 'resolved' })
          .eq('id', item.id)
        
        setItem({ ...item, status: 'resolved' })
      }

      fetchClaims()
    } catch (error: any) {
      console.error('Error updating claim:', error)
      alert('Failed to update claim: ' + error.message)
    }
  }

  const markAsResolved = async () => {
    if (!item || !user || user.id !== item.user_id) return

    if (!confirm('Mark this item as resolved? This will close all pending claims.')) return

    try {
      const { error } = await supabase
        .from('items')
        .update({ status: 'resolved' })
        .eq('id', item.id)

      if (error) throw error
      setItem({ ...item, status: 'resolved' })
      fetchClaims()
    } catch (error: any) {
      console.error('Error marking as resolved:', error)
      alert('Failed to mark as resolved: ' + error.message)
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
          <p className="text-gray-500 mb-4">Item not found</p>
          <Link to="/" className="text-blue-600 hover:text-blue-700">
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back
      </button>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">{item.title}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    item.category === 'lost'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {item.category}
                </span>
                {item.item_type && (() => {
                  const cat = getCategoryById(item.item_type as ItemType)
                  const Icon = cat.icon
                  return (
                    <span className={`px-3 py-1 rounded text-sm font-medium flex items-center gap-1 ${cat.color}`}>
                      <Icon size={14} />
                      {cat.name}
                    </span>
                  )
                })()}
                {item.status === 'resolved' && (
                  <span className="px-3 py-1 rounded text-sm font-medium bg-gray-100 text-gray-800 flex items-center gap-1">
                    <CheckCircle size={14} />
                    Resolved
                  </span>
                )}
                {approvedClaim && item.status === 'active' && (
                  <span className="px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-800 flex items-center gap-1">
                    <Shield size={14} />
                    Claim Approved
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
            <p className="text-gray-700 text-lg">{item.description}</p>

            {item.location && (
              <div className="flex items-center text-gray-600">
                <MapPin size={20} className="mr-2" />
                <span>{item.location}</span>
              </div>
            )}

            {item.contact_info && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Contact:</p>
                <p className="text-gray-600">{item.contact_info}</p>
              </div>
            )}

            <div className="flex items-center text-gray-500 text-sm">
              <Calendar size={16} className="mr-2" />
              Posted on {new Date(item.created_at).toLocaleDateString('en-US', {
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
            <div className="pt-6 border-t border-gray-200">
              {item.verified ? (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-green-800 font-medium flex items-center gap-2">
                    <CheckCircle size={20} />
                    This item is verified
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Your item has been verified and displays a verified badge.
                  </p>
                </div>
              ) : item.verification_status === 'pending' ? (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-yellow-800 font-medium">Verification Pending</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Your verification request is being reviewed. You'll be notified once it's processed.
                  </p>
                </div>
              ) : (
                <div>
                  {!showVerificationForm ? (
                    <button
                      onClick={() => setShowVerificationForm(true)}
                      className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <Shield size={20} />
                      Request Verification
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
            <div className="pt-6 border-t border-gray-200">
              {isOwner ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Claims ({pendingClaims.length})</h3>
                    <button
                      onClick={markAsResolved}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Mark as Resolved
                    </button>
                  </div>
                  
                  {claims.length === 0 ? (
                    <p className="text-gray-500 text-sm">No claims yet</p>
                  ) : (
                    <div className="space-y-3">
                      {claims.map((claim) => (
                        <div
                          key={claim.id}
                          className={`p-4 rounded-lg border ${
                            claim.status === 'approved'
                              ? 'bg-green-50 border-green-200'
                              : claim.status === 'rejected'
                              ? 'bg-red-50 border-red-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-sm">
                                {claim.claimed_by?.email || `User ${claim.claimed_by_user_id.slice(0, 8)}...`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(claim.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                claim.status === 'approved'
                                  ? 'bg-green-200 text-green-800'
                                  : claim.status === 'rejected'
                                  ? 'bg-red-200 text-red-800'
                                  : 'bg-yellow-200 text-yellow-800'
                              }`}
                            >
                              {claim.status}
                            </span>
                          </div>
                          {claim.message && (
                            <p className="text-sm text-gray-700 mt-2">{claim.message}</p>
                          )}
                          {claim.status === 'pending' && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleClaimStatus(claim.id, 'approved')}
                                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                              >
                                <CheckCircle size={16} />
                                Approve
                              </button>
                              <button
                                onClick={() => handleClaimStatus(claim.id, 'rejected')}
                                className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                              >
                                <XCircle size={16} />
                                Reject
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
                      className="w-full sm:w-auto px-6 py-4 bg-blue-600 text-white rounded-lg active:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 touch-manipulation min-h-[52px]"
                    >
                      <MessageSquare size={20} />
                      Claim This Item
                    </button>
                  ) : (
                    <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="font-semibold">Claim this item</h3>
                      <textarea
                        value={claimMessage}
                        onChange={(e) => setClaimMessage(e.target.value)}
                        placeholder="Optional: Add a message to the owner..."
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleClaim}
                          disabled={claiming}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {claiming ? 'Submitting...' : 'Submit Claim'}
                        </button>
                        <button
                          onClick={() => {
                            setShowClaimForm(false)
                            setClaimMessage('')
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {hasClaimed && (
                    <p className="text-sm text-gray-500">You have already claimed this item</p>
                  )}
                </div>
              ) : !user ? (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-3">Want to claim this item?</p>
                  <Link
                    to="/login"
                    className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Login to Claim
                  </Link>
                </div>
              ) : (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-800 font-medium">You have claimed this item</p>
                  <p className="text-sm text-blue-600 mt-1">
                    Waiting for owner's response...
                  </p>
                </div>
              )}
            </div>
          )}

          {isOwner && item.status === 'resolved' && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">This item has been resolved</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

