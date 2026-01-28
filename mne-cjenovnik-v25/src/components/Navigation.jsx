import { Icons } from './Icons'
import { useLanguage } from '../hooks/useLanguage'

export default function Navigation({ view, onNavigate, favoritesCount = 0 }) {
  const { t } = useLanguage()
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-white/5 z-50">
      <div className="flex justify-around items-center px-2 py-2 safe-bottom">
        <NavButton
          icon={<Icons.History />}
          label={t('nav.home')}
          active={view === 'home'}
          onClick={() => onNavigate('home')}
        />
        
        <NavButton
          icon={<Icons.Globe />}
          label={t('nav.community')}
          active={view === 'community'}
          onClick={() => onNavigate('community')}
        />
        
        <ScanButton onClick={() => onNavigate('scanner')} />
        
        <NavButton
          icon={<Icons.Star />}
          label={t('nav.favorites')}
          active={view === 'favorites'}
          onClick={() => onNavigate('favorites')}
          badge={favoritesCount > 0 ? favoritesCount : null}
        />
        
        <NavButton
          icon={<Icons.Settings />}
          label={t('nav.settings')}
          active={view === 'settings'}
          onClick={() => onNavigate('settings')}
        />
      </div>
    </nav>
  )
}

function NavButton({ icon, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`btn-press flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all relative ${
        active ? 'text-cyan-400 bg-cyan-500/10' : 'text-dark-500 hover:text-dark-300'
      }`}
    >
      <span className={`icon-bounce transition-transform ${active ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] scale-110' : ''}`}>
        {icon}
      </span>
      {badge && (
        <span className="absolute -top-0.5 right-1 w-4 h-4 bg-cyan-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}

function ScanButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="btn-press w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-white -translate-y-4 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 transition-all active:scale-95 glow-cyan"
    >
      <Icons.Scan className="w-6 h-6" />
    </button>
  )
}
