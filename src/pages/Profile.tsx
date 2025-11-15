import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Profile as ProfileType } from '../types/database.types'
import { MapPin, Phone, Edit2, Save, X } from 'lucide-react'

export default function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileType | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({
    itemsPosted: 0,
    itemsFound: 0,
    itemsResolved: 0,
    claimsMade: 0,
    claimsApproved: 0
  })

  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    phone: '',
    location: ''
  })

  useEffect(() => {
    fetchProfile()
    fetchStats()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setProfile(data)
        setFormData({
          full_name: data.full_name || '',
          bio: data.bio || '',
          phone: data.phone || '',
          location: data.location || ''
        })
      } else {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.email?.split('@')[0] || 'User'
          })
          .select()
          .single()

        if (createError) throw createError
        if (newProfile) {
          setProfile(newProfile)
          setFormData({
            full_name: newProfile.full_name || '',
            bio: newProfile.bio || '',
            phone: newProfile.phone || '',
            location: newProfile.location || ''
          })
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get items posted
      const { count: itemsPosted } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Get items resolved
      const { count: itemsResolved } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'resolved')

      // Get claims made
      const { count: claimsMade } = await supabase
        .from('claims')
        .select('*', { count: 'exact', head: true })
        .eq('claimed_by_user_id', user.id)

      // Get approved claims
      const { count: claimsApproved } = await supabase
        .from('claims')
        .select('*', { count: 'exact', head: true })
        .eq('claimed_by_user_id', user.id)
        .eq('status', 'approved')

      // Get items found (items where user's claim was approved)
      const { data: foundItems } = await supabase
        .from('claims')
        .select('item_id')
        .eq('claimed_by_user_id', user.id)
        .eq('status', 'approved')

      setStats({
        itemsPosted: itemsPosted || 0,
        itemsFound: foundItems?.length || 0,
        itemsResolved: itemsResolved || 0,
        claimsMade: claimsMade || 0,
        claimsApproved: claimsApproved || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          bio: formData.bio,
          phone: formData.phone,
          location: formData.location,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (error) throw error

      setProfile({ ...profile, ...formData })
      setEditing(false)
    } catch (error: any) {
      console.error('Error updating profile:', error)
      alert(t('profile.saveError', 'Failed to update profile: ') + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        phone: profile.phone || '',
        location: profile.location || ''
      })
    }
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-lg text-gray-900 dark:text-gray-100">{t('profile.loading', 'Loading...')}</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-lg text-gray-900 dark:text-gray-100">{t('profile.notFound', 'Profile not found')}</div>
      </div>
    )
  }

  const successRate = stats.itemsPosted > 0 
    ? Math.round((stats.itemsResolved / stats.itemsPosted) * 100) 
    : 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 px-6 py-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-2xl font-bold text-blue-600 dark:text-blue-400">
                {profile.full_name?.charAt(0).toUpperCase() || profile.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {profile.full_name || profile.email || t('profile.user', 'User')}
                </h1>
                {profile.email && (
                  <p className="text-blue-100 mt-1">{profile.email}</p>
                )}
                {profile.location && (
                  <div className="flex items-center gap-1 text-blue-100 mt-1">
                    <MapPin size={14} />
                    <span className="text-sm">{profile.location}</span>
                  </div>
                )}
              </div>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                aria-label={t('profile.edit', 'Edit profile')}
              >
                <Edit2 size={20} className="text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.itemsPosted}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('profile.itemsPosted', 'Items Posted')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.itemsResolved}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('profile.itemsResolved', 'Resolved')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.itemsFound}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('profile.itemsFound', 'Items Found')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.claimsMade}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('profile.claimsMade', 'Claims Made')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{successRate}%</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('profile.successRate', 'Success Rate')}</div>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="px-6 py-6">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.fullName', 'Full Name')}
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder={t('profile.fullNamePlaceholder', 'Enter your full name')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.bio', 'Bio')}
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder={t('profile.bioPlaceholder', 'Tell us about yourself...')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.phone', 'Phone')}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder={t('profile.phonePlaceholder', 'Enter your phone number')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.location', 'Location')}
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder={t('profile.locationPlaceholder', 'Enter your location')}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  <Save size={18} />
                  {t('profile.save', 'Save')}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <X size={18} />
                  {t('profile.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {profile.bio && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('profile.bio', 'Bio')}</h3>
                  <p className="text-gray-900 dark:text-gray-100">{profile.bio}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.phone && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Phone size={18} className="text-gray-500 dark:text-gray-400" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <MapPin size={18} className="text-gray-500 dark:text-gray-400" />
                    <span>{profile.location}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

