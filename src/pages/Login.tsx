import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { MapPin, Eye, EyeOff, Mail } from 'lucide-react'

export default function Login() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isResetMode, setIsResetMode] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)

  // Handle email confirmation callback
  useEffect(() => {
    const token = searchParams.get('token')
    const type = searchParams.get('type')
    
    if (token && type === 'recovery') {
      // Password reset callback - could navigate to reset password page
      // For now, we'll show a message
      setIsResetMode(true)
      setSuccess(t('login.resetPasswordReady'))
    }
  }, [searchParams, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        })
        
        if (error) throw error
        
        // Check if email confirmation is required
        if (data.user && !data.session) {
          setSuccess(t('login.checkEmail'))
          setEmail('')
          setPassword('')
        } else if (data.session) {
          // Email confirmation disabled - user is logged in immediately
          navigate('/')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        navigate('/')
      }
    } catch (error: any) {
      // Better error messages
      if (error.message.includes('Invalid login credentials')) {
        setError(t('login.invalidCredentials'))
      } else if (error.message.includes('Email not confirmed')) {
        setError(t('login.emailNotConfirmed'))
      } else if (error.message.includes('User already registered')) {
        setError(t('login.userExists'))
      } else {
        setError(error.message || t('login.error'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError(t('login.enterEmail'))
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/?type=recovery&token=reset`,
      })
      
      if (error) throw error
      
      setResetEmailSent(true)
      setSuccess(t('login.resetEmailSent'))
    } catch (error: any) {
      setError(error.message || t('login.resetError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="text-blue-600 dark:text-blue-400" size={40} />
            <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400">{t('app.name')}</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('app.tagline')}</p>
        </div>

        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
          {isResetMode 
            ? t('login.resetPassword') 
            : isSignUp 
              ? t('login.createAccount') 
              : t('login.title')}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-start gap-2">
            <span className="flex-shrink-0">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm flex items-start gap-2">
            <span className="flex-shrink-0">✓</span>
            <span>{success}</span>
          </div>
        )}

        {isResetMode && !resetEmailSent ? (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('login.email')}
              </label>
              <div className="relative">
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="your@email.com"
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('login.resetInstructions')}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 dark:bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('common.loading') : t('login.sendResetLink')}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(false)
                  setError(null)
                  setSuccess(null)
                  setEmail('')
                }}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
              >
                {t('login.backToLogin')}
              </button>
            </div>
          </form>
        ) : resetEmailSent ? (
          <div className="space-y-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Mail className="mx-auto mb-2 text-blue-600 dark:text-blue-400" size={32} />
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                {t('login.resetEmailSent')}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {t('login.checkSpam')}
              </p>
            </div>
            <button
              onClick={() => {
                setIsResetMode(false)
                setResetEmailSent(false)
                setEmail('')
                setSuccess(null)
              }}
              className="w-full bg-blue-600 dark:bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              {t('login.backToLogin')}
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('login.email')}
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="your@email.com"
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('login.password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {isSignUp && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t('login.passwordMinLength')}
                  </p>
                )}
              </div>

              {!isSignUp && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setIsResetMode(true)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    {t('login.forgotPassword')}
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 dark:bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? t('common.loading') : isSignUp ? t('login.signUp') : t('login.signIn')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError(null)
                  setSuccess(null)
                }}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
              >
                {isSignUp
                  ? t('login.alreadyHaveAccount')
                  : t('login.noAccount')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

