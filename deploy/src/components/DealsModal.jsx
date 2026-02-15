import { useState, useEffect } from 'react'
import { Icons } from './Icons'
import { getDealsAndChanges, updateLastVisit } from '../lib/deals'
import { useLanguage } from '../hooks/useLanguage'

export default function DealsModal({ onClose, onViewDeal }) {
  const { t } = useLanguage()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDeals()
  }, [])

  async function loadDeals() {
    setLoading(true)
    const result = await getDealsAndChanges()
    setData(result)
    setLoading(false)
    updateLastVisit()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="w-16 h-16 border-4 border-dark-700 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (!data?.hasNews) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-dark-900 rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-hidden animate-slide-up">
        <div className="relative bg-gradient-to-br from-orange-500 to-pink-600 px-6 py-8 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/30 transition-colors"
          >
            <Icons.Close className="w-5 h-5" />
          </button>
          
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🔥</span>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            {data.deals.length} {t('deals.dealsFound')}
          </h2>
          <p className="text-white/80 text-sm">
            {t('deals.bestPrices')}
          </p>
        </div>

        <div className="px-4 py-4 overflow-y-auto max-h-[50vh]">
          <div className="space-y-3">
            {data.deals.map((deal, index) => (
              <button
                key={deal.code}
                onClick={() => { onViewDeal(deal.code); onClose() }}
                className="w-full bg-dark-800 rounded-xl p-4 border border-white/5 hover:border-orange-500/30 hover:bg-dark-700/50 transition-all text-left animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-orange-400">-{deal.savingPercent}%</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug line-clamp-2">{deal.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-lg font-bold text-green-400 font-mono">{deal.minPrice.toFixed(2)} €</span>
                      <span className="text-sm text-dark-500 line-through font-mono">{deal.maxPrice.toFixed(2)} €</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-dark-400">
                      <Icons.Store className="w-3 h-3" />
                      <span>{deal.cheapestStore}</span>
                    </div>
                  </div>
                  
                  <Icons.ChevronRight className="w-5 h-5 text-dark-500 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/5">
          <button onClick={onClose} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold">
            {t('deals.startShopping')}
          </button>
        </div>
      </div>
    </div>
  )
}
