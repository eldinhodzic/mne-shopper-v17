import { Icons } from './Icons'
import { useLanguage } from '../hooks/useLanguage'

export default function Header({ productCount, communityStats, onSettingsClick }) {
  const { t } = useLanguage()
  
  return (
    <header className="glass sticky top-0 z-50 border-b border-white/5">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h1 className="text-xl text-heading gradient-text tracking-tight">
            {t('app.name')}
          </h1>
          <p className="text-sm text-dark-500 mt-0.5">
            {t('app.tagline')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Community indicator */}
          {communityStats && communityStats.total_products > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 bg-cyan-500/10 px-3 py-2 rounded-xl text-sm text-cyan-400 border border-cyan-500/20">
              <Icons.Globe className="w-4 h-4" />
              <span className="text-price-sm">{communityStats.total_products}</span>
            </div>
          )}
          
          {/* Local product count */}
          <div className="bg-dark-800 px-3 py-2 rounded-xl text-sm text-dark-300">
            <span className="text-price-sm text-cyan-400">{productCount}</span> {t('common.products')}
          </div>
          
          {/* Settings button */}
          <button
            onClick={onSettingsClick}
            className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <Icons.Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
