import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { erAdmin } from '../types/apv'
import { AppSwitcher } from '../platform-nav/AppSwitcher'

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'text-[13px] font-bold px-[11px] py-1.5 rounded-lg whitespace-nowrap transition-colors',
    isActive
      ? 'bg-white/12 text-white'
      : 'text-text-on-navy hover:bg-white/10 hover:text-white',
  ].join(' ')

// Navigations-shell. De enkelte APV-områder (Fund, Handlinger, Kemikalier,
// Maskiner, Påbud, Forslag) tilføjes her i deres respektive faser jf.
// PROJECT_OVERVIEW.md — de er bevidst udeladt i scaffold-fasen.
export default function Header() {
  const { profil } = useAuth()
  const navigate = useNavigate()
  const admin = erAdmin(profil)

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <header className="w-full bg-navy">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3 sm:gap-5 flex-wrap">

        {/* Logo */}
        <NavLink to="/" className="shrink-0 flex items-center gap-2 no-underline">
          <ShieldCheck size={18} className="text-primary" />
          <span className="text-white font-extrabold text-[15px] tracking-[-0.03em]">SMU APV</span>
        </NavLink>

        {/* Navigation — opslagsområderne */}
        <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
          <NavLink to="/" end className={navClass}>Forside</NavLink>
          <NavLink to="/kemikalier" className={navClass}>Kemikalier</NavLink>
          <NavLink to="/maskiner" className={navClass}>Maskiner</NavLink>
          <NavLink to="/fund" className={navClass}>Fund</NavLink>
          <NavLink to="/paabud" className={navClass}>Påbud</NavLink>
          <NavLink to="/mine-forslag" className={navClass}>Mine forslag</NavLink>
          {admin && <NavLink to="/admin/forslag" className={navClass}>Forslag</NavLink>}
        </nav>

        {/* Bruger + logout + platform-skifter */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Diskret skift til Hub og brugerens øvrige SMU-apps */}
          <AppSwitcher supabase={supabase} currentAppKey="apv" />
          {profil && (
            <div className="text-right hidden sm:block leading-tight">
              <p className="text-white font-bold text-[13px] m-0">{profil.fuldt_navn ?? 'Unavngivet'}</p>
              <p className="text-text-on-navy font-semibold text-[11px] mt-0.5">{admin ? 'Admin' : 'Medarbejder'}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Log ud"
            className="p-2 rounded-lg text-text-on-navy hover:text-white hover:bg-white/12 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
