import { useState, useEffect } from 'react'
import { Icons } from './Icons'
import { getCommunityPrices } from '../lib/supabase'
import { useLanguage } from '../hooks/useLanguage'

export default function CommunityProductDetail({ productCode, onClose }) {
  const { t } = useLanguage()
  const [product, setProduct] = useState(null)
  const [prices, setPrices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProductPrices()
  }, [productCode])

  async function loadProductPrices() {
    setLoading(true)
    try {
      const data = await getCommunityPrices(productCode)
      if (data && data.length > 0) {
        setProduct({
          code: data[0].product_code,
          name: data[0].product_name,
          unit: data[0].product_unit
        })
        setPrices(data)
      }
    } catch (err) {
      console.error('Error loading product:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-dark-700 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="animate-fade-in">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors mb-4 text-sm"
        >
          <Icons.ChevronLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
        <div className="text-center py-12 text-dark-400">
          <p>{t('product.notFound')}</p>
        </div>
      </div>
    )
  }

  // Calculate stats
  const minPrice = Math.min(...prices.map(p => parseFloat(p.price)))
  const maxPrice = Math.max(...prices.map(p => parseFloat(p.price)))
  const avgPrice = prices.reduce((sum, p) => sum + parseFloat(p.price), 0) / prices.length
  const priceDiff = maxPrice - minPrice

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
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <Icons.Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-cyan-400 font-medium mb-1">{t('community.title')}</p>
            <h2 className="text-lg font-semibold leading-snug">
              {product.name}
            </h2>
          </div>
        </div>
        
        <p className="text-sm text-dark-400 font-mono">
          {t('product.barcode')}: {product.code}
        </p>
      </div>

      {/* Price Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-dark-800 rounded-xl p-3 text-center border border-white/5">
          <p className="text-[10px] text-dark-400 uppercase tracking-wide mb-1">{t('product.min')}</p>
          <p className="text-sm font-semibold font-mono text-green-400">
            {minPrice.toFixed(2)} €
          </p>
        </div>
        <div className="bg-dark-800 rounded-xl p-3 text-center border border-white/5">
          <p className="text-[10px] text-dark-400 uppercase tracking-wide mb-1">{t('product.avg')}</p>
          <p className="text-sm font-semibold font-mono text-blue-400">
            {avgPrice.toFixed(2)} €
          </p>
        </div>
        <div className="bg-dark-800 rounded-xl p-3 text-center border border-white/5">
          <p className="text-[10px] text-dark-400 uppercase tracking-wide mb-1">{t('product.max')}</p>
          <p className="text-sm font-semibold font-mono text-red-400">
            {maxPrice.toFixed(2)} €
          </p>
        </div>
      </div>

      {/* Potential Savings */}
      {priceDiff > 0.01 && (
        <div className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 rounded-xl p-4 mb-4 border border-green-500/20 text-center">
          <p className="text-xs text-dark-400 mb-1">{t('product.potentialSavings')}</p>
          <p className="text-2xl font-bold text-green-400 font-mono">
            {priceDiff.toFixed(2)} €
          </p>
          <p className="text-xs text-dark-400 mt-1">
            {t('product.byBuyingCheapest')}
          </p>
        </div>
      )}

      {/* Prices by Store */}
      <div className="bg-dark-800 rounded-2xl overflow-hidden border border-white/5">
        <div className="px-4 py-3 border-b border-white/5">
          <h3 className="text-sm font-semibold">Cijene po prodavnicama</h3>
          <p className="text-xs text-dark-400 mt-0.5">{prices.length} prodavnica</p>
        </div>

        <div className="divide-y divide-white/[0.03]">
          {prices.map((price, index) => {
            const priceValue = parseFloat(price.price)
            const isCheapest = priceValue === minPrice
            const date = new Date(price.scanned_at)
            
            return (
              <div
                key={price.id}
                className={`px-4 py-3 flex items-center gap-3 ${
                  isCheapest ? 'bg-green-500/5' : ''
                }`}
              >
                {isCheapest && (
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs">🏆</span>
                  </div>
                )}
                
                <div className={`flex-1 ${!isCheapest ? 'ml-9' : ''}`}>
                  <p className="text-sm font-medium">{price.store_name}</p>
                  {price.store_city && (
                    <p className="text-xs text-dark-400 mt-0.5 flex items-center gap-1">
                      <Icons.MapPin className="w-3 h-3" />
                      {price.store_city}
                    </p>
                  )}
                  <p className="text-xs text-dark-500 mt-0.5">
                    {date.toLocaleDateString('sr-Latn-ME', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className={`text-sm font-bold font-mono ${
                    isCheapest ? 'text-green-400' : 'text-white'
                  }`}>
                    {priceValue.toFixed(2)} €
                  </p>
                  {isCheapest && prices.length > 1 && (
                    <p className="text-[10px] text-green-400">Najjeftinije</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
