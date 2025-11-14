import { Link } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { Plus, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface NavbarProps {
  user: User | null
}

export default function Navbar({ user }: NavbarProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center">
            <h1 className="text-2xl font-bold text-blue-600">Fynd</h1>
          </Link>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  to="/post"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={20} />
                  <span className="hidden sm:inline">Post Item</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label="Logout"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

