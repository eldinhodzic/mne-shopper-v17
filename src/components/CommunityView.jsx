import { useState, useEffect } from 'react'
import { Icons } from './Icons'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../hooks/useLanguage'

export default function CommunityView({ onProductClick, onClose }) {
  const { t } = useLanguage()
  const [products, setProducts] = useState([])
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStore, setSelectedStore] = useState(null)
  const [view, setView] = useState('products')

  useEffect(() => {
    loadCommunityData()
  }, [])

  async function loadCommunityData() {
    setLoading(true)
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('latest_prices')
        .select('*')
        .order('product_name')
      
      if (!productsError && productsData) {
        const productMap = {}
        productsData.forEach(p => {
          if (!productMap[p.product_code]) {
            productMap[p.product_code] = {
              code: p.product_code,
              name: p.product_name,
              unit: p.product_unit,
              prices: [],
              minPrice: Infinity,
              maxPrice: 0,
              storeCount: 0
            }
          }
          const price = parseFloat(p.price)
          productMap[p.product_code].prices.push({
            price,
            store: p.store_name,
            city: p.store_city,
            date: p.scanned_at
          })
          if (price < productMap[p.product_code].minPrice) {
            productMap[p.product_code].minPrice = price
            productMap[p.product_code].cheapestStore = p.store_name
          }
          if (price > productMap[p.product_code].maxPrice) {
            productMap[p.product_code].maxPrice = price
          }
          productMap[p.product_code].storeCount = productMap[p.product_code].prices.length
        })
        setProducts(Object.values(productMap))
      }

      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('*')
        .order('name')
      
      if (!storesError && storesData) {
        setStores(storesData)
      }
    } catch (err) {
      console.error('Error loading community data:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredStores = stores.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.city?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors text-sm"
        >
          <Icons.ChevronLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <Icons.Globe className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold">{t('community.title')}</h1>
          <p className="text-xs text-dark-400">{t('community.subtitle')}</p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView('products')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            view === 'products'
              ? 'bg-cyan-500 text-white'
              : 'bg-dark-800 text-dark-400 hover:text-white'
          }`}
        >
          {t('community.products')} ({products.length})
        </button>
        <button
          onClick={() => setView('stores')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            view === 'stores'
              ? 'bg-cyan-500 text-white'
              : 'bg-dark-800 text-dark-400 hover:text-white'
          }`}
        >
          {t('community.stores')} ({stores.length})
        </button>
      </div>

      {/* Search */}
      <div className="bg-dark-800 rounded-xl p-3 flex items-center gap-3 mb-4 border border-white/5">
        <Icons.Search className="text-dark-400" />
        <input
          type="text"
          placeholder={view === 'products' ? t('community.searchProducts') : t('community.searchStores')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-dark-500 text-[15px]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-dark-400 hover:text-white"
          >
            <Icons.Close className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-dark-700 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      ) : view === 'products' ? (
        <ProductsList 
          products={filteredProducts} 
          onProductClick={onProductClick}
          t={t}
        />
      ) : (
        <StoresList 
          stores={filteredStores}
          selectedStore={selectedStore}
          onStoreSelect={setSelectedStore}
          t={t}
        />
      )}
    </div>
  )
}

function ProductsList({ products, onProductClick, t }) {
  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-dark-400">
        <Icons.Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>{t('compare.noData')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {products.map(product => (
        <div
          key={product.code}
          onClick={() => onProductClick(product)}
          className="card-interactive bg-dark-800 rounded-xl p-4 cursor-pointer border border-white/5 hover:border-cyan-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-[15px] font-medium truncate">{product.name}</p>
              <p className="text-xs text-dark-400 mt-1">
                {t('community.storeCount', { count: product.storeCount })}
              </p>
            </div>
            
            <div className="text-right flex-shrink-0">
              {product.minPrice !== product.maxPrice ? (
                <>
                  <p className="text-sm text-cyan-400 font-semibold">
                    €{product.minPrice.toFixed(2)} - €{product.maxPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-green-400 mt-0.5">
                    {t('community.cheapestAt', { store: product.cheapestStore })}
                  </p>
                </>
              ) : (
                <p className="text-sm text-cyan-400 font-semibold">
                  €{product.minPrice.toFixed(2)}
                </p>
              )}
            </div>
            
            <Icons.ChevronRight className="text-dark-600 ml-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function StoresList({ stores, selectedStore, onStoreSelect, t }) {
  if (stores.length === 0) {
    return (
      <div className="text-center py-8 text-dark-400">
        <Icons.Store className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>{t('compare.noData')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {stores.map(store => (
        <div
          key={store.id}
          onClick={() => onStoreSelect(store.id === selectedStore ? null : store.id)}
          className={`bg-dark-800 rounded-xl p-4 cursor-pointer border transition-all ${
            selectedStore === store.id 
              ? 'border-cyan-500/50 bg-cyan-500/5' 
              : 'border-white/5 hover:border-cyan-500/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Icons.Store />
            </div>
            
            <div className="flex-1">
              <p className="text-[15px] font-medium">{store.name}</p>
              {store.city && (
                <p className="text-xs text-dark-400 mt-0.5">{store.city}</p>
              )}
            </div>
            
            <Icons.ChevronRight className={`text-dark-600 transition-transform ${
              selectedStore === store.id ? 'rotate-90' : ''
            }`} />
          </div>
        </div>
      ))}
    </div>
  )
}
