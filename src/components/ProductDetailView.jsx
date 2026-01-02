import { useState, useEffect } from 'react'
import { Icons } from './Icons'
import { getCommunityPrices } from '../lib/supabase'
import { useLanguage } from '../hooks/useLanguage'

export default function ProductDetailView({ product, onClose }) {
  const { t } = useLanguage()
  const [communityPrices, setCommunityPrices] = useState([])
  const [loadingCommunity, setLoadingCommunity] = useState(true)
  const [productInfo, setProductInfo] = useState(product)
  
  const history = product.history || []
  const hasHistory = history.length > 1

  // Load community prices
  useEffect(() => {
    async function loadCommunityPrices() {
      setLoadingCommunity(true)
      try {
        const prices = await getCommunityPrices(product.code)
        setCommunityPrices(prices)
        
        // If we don't have local product info, use community data
        if ((!product.name || product.name === 'Učitavanje...') && prices.length > 0) {
          setProductInfo({
            ...product,
            name: prices[0].product_name,
            latestPrice: parseFloat(prices[0].price)
          })
        }
      } catch (err) {
        console.error('Failed to load community prices:', err)
      } finally {
        setLoadingCommunity(false)
      }
    }
    
    if (product.code) {
      loadCommunityPrices()
    }
  }, [product.code, product.name])

  // Calculate stats from local history
  let minPrice = Infinity
  let maxPrice = 0
  let avgPrice = 0
  
  if (history.length > 0) {
    history.forEach(h => {
      if (h.price < minPrice) minPrice = h.price
      if (h.price > maxPrice) maxPrice = h.price
      avgPrice += h.price
    })
    avgPrice = avgPrice / history.length
  }

  // Find cheapest from community
  const cheapestCommunity = communityPrices.length > 0 ? communityPrices[0] : null
  const mostExpensiveCommunity = communityPrices.length > 0 ? communityPrices[communityPrices.length - 1] : null
  const potentialSaving = cheapestCommunity && mostExpensiveCommunity 
    ? (mostExpensiveCommunity.price - cheapestCommunity.price).toFixed(2)
    : null

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

      {/* Product Header */}
      <div className="bg-dark-800 rounded-2xl p-5 mb-4 border border-white/5">
        <h2 className="text-lg font-semibold leading-snug mb-2">
          {productInfo.name}
        </h2>
        <p className="text-sm text-dark-400 font-mono mb-4">
          {t('product.barcode')}: {productInfo.code}
        </p>

        {productInfo.latestPrice && (
          <div className="flex items-center gap-2 bg-dark-700 p-3 rounded-xl">
            <Icons.Euro className="text-dark-400" />
            <span className="text-sm text-dark-300">{t('product.yourLastPrice')}</span>
            <span className="ml-auto text-xl font-bold font-mono text-cyan-400">
              {productInfo.latestPrice?.toFixed(2)} €
            </span>
          </div>
        )}
      </div>

      {/* Community Prices - NEW SECTION */}
      <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl p-4 mb-4 border border-cyan-500/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <Icons.Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t('product.communityPrices')}</h3>
            <p className="text-xs text-dark-400">{t('product.comparePrices')}</p>
          </div>
        </div>

        {loadingCommunity ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-dark-600 border-t-cyan-400 rounded-full animate-spin" />
            <span className="ml-2 text-sm text-dark-400">{t('common.loading')}</span>
          </div>
        ) : communityPrices.length === 0 ? (
          <div className="text-center py-4 text-sm text-dark-400">
            <p>{t('product.noData')}</p>
            <p className="text-xs mt-1">{t('product.beFirst')}</p>
          </div>
        ) : (
          <>
            {/* Price comparison cards */}
            <div className="space-y-2 mb-3">
              {communityPrices.slice(0, 5).map((price, index) => (
                <div 
                  key={price.id}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    index === 0 
                      ? 'bg-green-500/15 border border-green-500/30' 
                      : 'bg-dark-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {index === 0 && (
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                        <span className="text-xs">🏆</span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{price.store_name}</p>
                      {price.store_city && (
                        <p className="text-xs text-dark-400">{price.store_city}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold font-mono ${
                      index === 0 ? 'text-green-400' : 'text-white'
                    }`}>
                      {parseFloat(price.price).toFixed(2)} €
                    </p>
                    {index === 0 && communityPrices.length > 1 && (
                      <p className="text-xs text-green-400">{t('product.cheapest')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Potential saving */}
            {potentialSaving && parseFloat(potentialSaving) > 0 && (
              <div className="bg-dark-800/50 rounded-xl p-3 text-center">
                <p className="text-xs text-dark-400">{t('product.potentialSaving')}</p>
                <p className="text-lg font-bold text-green-400 font-mono">
                  {potentialSaving} €
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Local Statistics */}
      {hasHistory && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatCard label={t('product.min')} value={`${minPrice.toFixed(2)} €`} color="text-green-400" />
          <StatCard label={t('product.avg')} value={`${avgPrice.toFixed(2)} €`} color="text-blue-400" />
          <StatCard label={t('product.max')} value={`${maxPrice.toFixed(2)} €`} color="text-red-400" />
        </div>
      )}

      {/* Your Price History */}
      <div className="bg-dark-800 rounded-2xl overflow-hidden border border-white/5">
        <div className="px-4 py-3 border-b border-white/5">
          <h3 className="text-sm font-semibold">{t('product.yourHistory')}</h3>
        </div>

        {history.length === 0 ? (
          <div className="p-6 text-center text-dark-400 text-sm">
            {t('product.noHistory')}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {history.map((record, index) => {
              const date = new Date(record.date)
              const prevRecord = history[index + 1]
              const diff = prevRecord ? record.price - prevRecord.price : 0

              return (
                <div key={index} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{record.store}</p>
                    <p className="text-xs text-dark-400 mt-0.5">
                      {date.toLocaleDateString('sr-Latn-ME', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold font-mono">
                      {record.price.toFixed(2)} €
                    </p>
                    {diff !== 0 && (
                      <p className={`text-xs mt-0.5 ${diff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(2)} €
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-dark-800 rounded-xl p-3 text-center border border-white/5">
      <p className="text-[10px] text-dark-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-sm font-semibold font-mono ${color}`}>
        {value}
      </p>
    </div>
  )
}
