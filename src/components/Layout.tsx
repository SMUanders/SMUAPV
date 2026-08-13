import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from './Header'

export default function Layout() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <p className="smu-meta text-sm">Indlæser…</p>
      </div>
    )
  }

  if (!user) {
    // Husk den ønskede side (fx QR → /maskiner/:id/dagligt-tjek) og returnér efter login.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Header />
      <main className="flex-1 w-full max-w-[1100px] mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
