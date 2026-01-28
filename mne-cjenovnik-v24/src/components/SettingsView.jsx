import { Icons } from './Icons'
import { useLanguage } from '../hooks/useLanguage'

export default function SettingsView({ settings, onToggle, communityStats, onClose }) {
  const { t, language, setLanguage, languages } = useLanguage()
  
  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <button
        onClick={onClose}
        className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors mb-4 text-sm"
      >
        <Icons.ChevronLeft className="w-4 h-4" />
        {t('common.back')}
      </button>

      <h1 className="text-xl font-bold mb-6">{t('settings.title')}</h1>

      {/* Language Selector */}
      <div className="bg-dark-800 rounded-2xl overflow-hidden border border-white/5 mb-4">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Icons.Globe className="w-4 h-4 text-purple-400" />
          </div>
          <h2 className="text-sm font-semibold">{t('settings.language')}</h2>
        </div>
        
        <div className="p-2 grid grid-cols-2 gap-2">
          {Object.values(languages).map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                language === lang.code
                  ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400'
                  : 'bg-dark-700/50 border border-transparent hover:bg-dark-700 text-dark-300'
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <span className="text-sm font-medium">{lang.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Community Section */}
      <div className="bg-dark-800 rounded-2xl overflow-hidden border border-white/5 mb-4">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <Icons.Users className="w-4 h-4 text-cyan-400" />
          </div>
          <h2 className="text-sm font-semibold">{t('settings.sharing')}</h2>
        </div>

        {/* Share with community toggle */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 mr-4">
              <p className="text-sm font-medium">{t('settings.shareWithCommunity')}</p>
              <p className="text-xs text-dark-400 mt-1">
                {t('settings.shareDescription')}
              </p>
            </div>
            <Toggle 
              enabled={settings.shareWithCommunity} 
              onChange={() => onToggle('shareWithCommunity')} 
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <p className="text-sm font-medium">{t('settings.showCommunityPrices')}</p>
              <p className="text-xs text-dark-400 mt-1">
                {t('settings.showCommunityDescription')}
              </p>
            </div>
            <Toggle 
              enabled={settings.showCommunityPrices} 
              onChange={() => onToggle('showCommunityPrices')} 
            />
          </div>
        </div>
      </div>

      {/* Community Stats */}
      {communityStats && (
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl p-4 mb-4 border border-cyan-500/20">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Icons.Globe className="w-4 h-4 text-cyan-400" />
            {t('community.title')}
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <StatBox 
              label={t('common.products')} 
              value={communityStats.total_products?.toLocaleString() || '0'} 
            />
            <StatBox 
              label={t('common.stores')} 
              value={communityStats.total_stores?.toLocaleString() || '0'} 
            />
          </div>
        </div>
      )}

      {/* Privacy Info */}
      <div className="bg-dark-800 rounded-2xl p-4 border border-white/5">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Icons.Check className="w-4 h-4 text-green-400" />
          {t('settings.privacy')}
        </h3>
        <p className="text-xs text-dark-400">
          {t('settings.privacyDescription')}
        </p>
      </div>

      {/* App Info */}
      <div className="mt-6 text-center text-xs text-dark-500">
        <p>{t('app.name')} v1.0.0</p>
        <p className="mt-1">Made with ❤️ for Montenegro</p>
      </div>
    </div>
  )
}

function Toggle({ enabled, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        enabled ? 'bg-cyan-500' : 'bg-dark-600'
      }`}
    >
      <div
        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function StatBox({ label, value }) {
  return (
    <div className="bg-dark-800/50 rounded-xl p-3 text-center">
      <p className="text-lg font-bold font-mono text-cyan-400">{value}</p>
      <p className="text-xs text-dark-400">{label}</p>
    </div>
  )
}
