import { useState, useEffect } from 'react'
import { Icons } from './Icons'
import { getPersonalInflation } from '../lib/deals'
import { useLanguage } from '../hooks/useLanguage'

export default function InflationDashboard({ localProducts, onClose }) {
  const { t } = useLanguage()
  const [inflation, setInflation] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    calculateInflation()
  }, [localProducts])

  async function calculateInflation() {
    setLoading(true)
    const productsWithHistory = localProducts?.filter(p => p.history && p.history.length >= 2) || []
    
    if (productsWithHistory.length < 2) {
      setInflation(null)
      setLoading(false)
      return
    }
    
    const result = await getPersonalInflation(productsWithHistory)
    setInflation(result)
    setLoading(false)
  }

  return (
    <div className="animate-fade-in">
      <button onClick={onClose} className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors mb-4 text-sm">
        <Icons.ChevronLeft className="w-4 h-4" />
        {t('common.back')}
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Icons.TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold">{t('inflation.title')}</h1>
          <p className="text-xs text-dark-400">{t('inflation.subtitle')}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-dark-700 border-t-purple-400 rounded-full animate-spin" />
        </div>
      ) : !inflation ? (
        <div className="bg-dark-800 rounded-2xl p-8 text-center border border-white/5">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
            <Icons.TrendingUp className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t('inflation.notEnoughData')}</h3>
          <p className="text-sm text-dark-400">{t('inflation.scanMore')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`rounded-2xl p-6 text-center border ${
            inflation.direction === 'up' 
              ? 'bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20' 
              : 'bg-gradient-to-br from-green-500/10 to-cyan-500/10 border-green-500/20'
          }`}>
            <p className="text-sm text-dark-400 mb-2">{t('inflation.yourInflation')}</p>
            <div className="flex items-center justify-center gap-3 mb-2">
              {inflation.direction === 'up' ? (
                <Icons.TrendUp className="w-8 h-8 text-red-400" />
              ) : (
                <Icons.TrendDown className="w-8 h-8 text-green-400" />
              )}
              <span className={`text-5xl font-bold font-mono ${
                inflation.direction === 'up' ? 'text-red-400' : 'text-green-400'
              }`}>
                {inflation.direction === 'up' ? '+' : ''}{inflation.overallInflation}%
              </span>
            </div>
            <p className="text-sm text-dark-400">~{inflation.periodDays} {t('inflation.days')} • {inflation.productsAnalyzed} {t('common.products')}</p>
          </div>

          {inflation.topIncreases.length > 0 && (
            <div className="bg-dark-800 rounded-2xl overflow-hidden border border-white/5">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Icons.TrendUp className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-semibold">{t('inflation.mostExpensive')}</h3>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {inflation.topIncreases.map(item => (
                  <div key={item.code} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 text-xs font-bold">
                      +{item.change.toFixed(0)}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.name}</p>
                      <p className="text-xs text-dark-500">{item.oldPrice.toFixed(2)}€ → {item.newPrice.toFixed(2)}€</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inflation.topDecreases.length > 0 && (
            <div className="bg-dark-800 rounded-2xl overflow-hidden border border-white/5">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Icons.TrendDown className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold">{t('inflation.mostCheaper')}</h3>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {inflation.topDecreases.map(item => (
                  <div key={item.code} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 text-xs font-bold">
                      {item.change.toFixed(0)}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.name}</p>
                      <p className="text-xs text-dark-500">{item.oldPrice.toFixed(2)}€ → {item.newPrice.toFixed(2)}€</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
