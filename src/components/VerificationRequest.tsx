import { useState } from 'react'
import { Upload, X, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface VerificationRequestProps {
  itemId: string
  onSuccess?: () => void
}

export default function VerificationRequest({ itemId, onSuccess }: VerificationRequestProps) {
  const [verificationPhotos, setVerificationPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + verificationPhotos.length > 5) {
      setError('Maximum 5 photos allowed')
      return
    }

    const newPhotos = [...verificationPhotos, ...files]
    setVerificationPhotos(newPhotos)

    // Create previews
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    setVerificationPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (verificationPhotos.length < 2) {
      setError('Please upload at least 2 verification photos')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('You must be logged in')

      // Upload verification photos
      const photoUrls: string[] = []
      for (const photo of verificationPhotos) {
        const fileExt = photo.name.split('.').pop()
        const fileName = `verification-${itemId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `verifications/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(filePath, photo)

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from('item-images').getPublicUrl(filePath)
        photoUrls.push(publicUrl)
      }

      // Create verification request
      const { error: insertError } = await supabase.from('verifications').insert({
        item_id: itemId,
        user_id: user.id,
        verification_photos: photoUrls,
        verification_notes: notes || null,
        status: 'pending',
      })

      if (insertError) throw insertError

      // Update item verification status
      await supabase
        .from('items')
        .update({ verification_status: 'pending' })
        .eq('id', itemId)

      if (onSuccess) {
        onSuccess()
      }
      
      // Reset form
      setVerificationPhotos([])
      setPhotoPreviews([])
      setNotes('')
      alert('Verification request submitted! It will be reviewed shortly.')
    } catch (error: any) {
      console.error('Error submitting verification:', error)
      setError(error.message || 'Failed to submit verification request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Request Verification</h3>
      <p className="text-sm text-gray-600 mb-4">
        Upload additional photos to verify your item. This helps build trust and reduces fraud.
        You need at least 2 photos showing different angles or details.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Verification Photos (2-5 photos) *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            {photoPreviews.map((preview, index) => (
              <div key={index} className="relative">
                <img
                  src={preview}
                  alt={`Verification ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            {photoPreviews.length < 5 && (
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-xs text-gray-500">Add Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  multiple
                />
              </label>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {verificationPhotos.length}/5 photos uploaded
          </p>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes (Optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add any additional information that helps verify this item..."
          />
        </div>

        <button
          type="submit"
          disabled={loading || verificationPhotos.length < 2}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="animate-spin" size={20} />
              Submitting...
            </>
          ) : (
            'Submit Verification Request'
          )}
        </button>
      </form>
    </div>
  )
}

