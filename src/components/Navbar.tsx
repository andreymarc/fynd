import { Link } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { Plus, LogOut, Moon, Sun, MapPin, UserCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import NotificationCenter from './NotificationCenter'

interface NavbarProps {
  user: User | null
}

export default function Navbar({ user }: NavbarProps) {
  const { theme, toggleTheme } = useTheme()
  const { t, i18n } = useTranslation()
  
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const setLanguage = (lang: 'en' | 'he') => {
    i18n.changeLanguage(lang)
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <MapPin className="text-blue-600 dark:text-blue-400" size={24} />
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Fynd</h1>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700 shadow-sm">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 min-w-[44px] ${
                  i18n.language === 'en'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                aria-label="English"
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('he')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 min-w-[44px] ${
                  i18n.language === 'he'
                    ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                aria-label="עברית"
              >
                עברית
              </button>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

                    {user ? (
                      <>
                        <NotificationCenter userId={user.id} />
                        <Link
                          to="/profile"
                          className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                          aria-label={t('nav.profile', 'Profile')}
                        >
                          <UserCircle size={20} />
                        </Link>
                        <Link
                          to="/post"
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                        >
                          <Plus size={20} />
                          <span className="hidden sm:inline">{t('nav.postItem')}</span>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                          aria-label="Logout"
                        >
                          <LogOut size={20} />
                        </button>
                      </>
                    ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                {t('nav.login')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

