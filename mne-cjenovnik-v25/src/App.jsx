import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, saveProduct, getPriceChanges, getProductWithHistory, checkPriceAlerts } from './lib/db'
import { fetchInvoice, parseQRUrl } from './lib/api'
import { submitReceiptToCommunity, getCommunityStats } from './lib/supabase'
import { useSettings } from './hooks/useSettings'
import { getLastVisit, updateLastVisit } from './lib/deals'

// Components
import Header from './components/Header'
import Navigation from './components/Navigation'
import HomeView from './components/HomeView'
import Scanner from './components/Scanner'
import ReceiptView from './components/ReceiptView'
import ProductsView from './components/ProductsView'
import ProductDetailView from './components/ProductDetailView'
import CommunityView from './components/CommunityView'
import CommunityProductDetail from './components/CommunityProductDetail'
import ShoppingListView from './components/ShoppingListView'
import FavoritesView from './components/FavoritesView'
import SettingsView from './components/SettingsView'
import DealsModal from './components/DealsModal'
import InflationDashboard from './components/InflationDashboard'
import ShareCard from './components/ShareCard'
import LoadingOverlay from './components/LoadingOverlay'
import Toast from './components/Toast'
import SuccessAnimation from './components/SuccessAnimation'

export default function App() {
  // View state
  const [view, setView] = useState('home')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showDealsModal, setShowDealsModal] = useState(false)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [successData, setSuccessData] = useState(null)
  
  // Data state
  const [currentReceipt, setCurrentReceipt] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedCommunityProduct, setSelectedCommunityProduct] = useState(null)
  const [priceChanges, setPriceChanges] = useState([])
  const [communityStats, setCommunityStats] = useState(null)
  const [productsWithHistory, setProductsWithHistory] = useState([])
  
  // Settings
  const { settings, toggleSetting } = useSettings()

  // Live queries from IndexedDB
  const receipts = useLiveQuery(
    () => db.receipts.orderBy('date').reverse().limit(20).toArray(),
    []
  )
  
  const products = useLiveQuery(
    () => db.products.orderBy('name').toArray(),
    []
  )
  
  const favorites = useLiveQuery(
    () => db.favorites.toArray(),
    []
  )

  // Check for first visit of the day and show deals
  useEffect(() => {
    const lastVisit = getLastVisit()
    const now = new Date()
    
    // Show deals if first visit today or no visit in last 4 hours
    const shouldShowDeals = !lastVisit || 
      (now - lastVisit) > 4 * 60 * 60 * 1000 || // 4 hours
      lastVisit.toDateString() !== now.toDateString() // Different day
    
    if (shouldShowDeals) {
      // Delay slightly for better UX
      const timer = setTimeout(() => {
        loadCommunityStats().then(() => {
          if (communityStats?.total_products > 0) {
            setShowDealsModal(true)
          }
        })
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [])

  // Load data on mount
  useEffect(() => {
    loadPriceChanges()
    loadCommunityStats()
  }, [receipts])

  // Load products with history for inflation calculation
  useEffect(() => {
    loadProductsWithHistory()
  }, [products])

  async function loadPriceChanges() {
    const changes = await getPriceChanges(10)
    setPriceChanges(changes)
  }
  
  async function loadCommunityStats() {
    const stats = await getCommunityStats()
    setCommunityStats(stats)
  }

  async function loadProductsWithHistory() {
    if (!products || products.length === 0) return
    
    const withHistory = await Promise.all(
      products.slice(0, 50).map(async (p) => {
        const full = await getProductWithHistory(p.code)
        return full
      })
    )
    setProductsWithHistory(withHistory.filter(p => p && p.history))
  }

  // Handle QR code scan
  const handleScan = useCallback(async (decodedText) => {
    setLoading(true)
    setError(null)

    try {
      const params = parseQRUrl(decodedText)
      
      if (!params || !params.iic) {
        throw new Error('Nevažeći QR kod')
      }

      const invoice = await fetchInvoice(params.iic, params.dateTimeCreated, params.tin)

      const receiptData = {
        iic: invoice.iic,
        date: new Date(invoice.dateTimeCreated),
        store: invoice.seller?.name || 'Nepoznata prodavnica',
        storeAddress: invoice.seller?.address || '',
        total: invoice.totalPrice,
        items: invoice.items || []
      }

      await db.receipts.add(receiptData)

      const storeName = invoice.seller?.name || 'Nepoznato'
      const invoiceDate = new Date(invoice.dateTimeCreated)

      for (const item of invoice.items || []) {
        await saveProduct(item, storeName, invoiceDate)
      }

      const itemCount = invoice.items?.length || 0
      
      if (settings.shareWithCommunity) {
        try {
          await submitReceiptToCommunity(invoice)
          setSuccessData({
            message: 'Račun sačuvan!',
            subMessage: `${itemCount} proizvoda dodato u zajednicu`
          })
        } catch (err) {
          setSuccessData({
            message: 'Račun sačuvan!',
            subMessage: `${itemCount} proizvoda sačuvano lokalno`
          })
        }
      } else {
        setSuccessData({
          message: 'Račun sačuvan!',
          subMessage: `${itemCount} proizvoda sačuvano`
        })
      }
      
      setShowSuccessAnimation(true)
      setCurrentReceipt(receiptData)
      
      await loadPriceChanges()
      await loadCommunityStats()

    } catch (err) {
      console.error('Scan error:', err)
      setError(err.message || 'Greška pri skeniranju')
      setView('home')
    } finally {
      setLoading(false)
    }
  }, [settings.shareWithCommunity])

  // View product detail (local)
  async function viewProductDetail(code) {
    const product = await getProductWithHistory(code)
    setSelectedProduct(product)
    setView('product-detail')
  }

  // View community product detail
  function viewCommunityProductDetail(code) {
    setSelectedCommunityProduct(code)
    setView('community-product-detail')
  }

  // Navigation handler
  function handleNavigate(newView) {
    if (newView === 'home') {
      setCurrentReceipt(null)
      setSelectedProduct(null)
      setSelectedCommunityProduct(null)
    }
    setView(newView)
  }

  // Close deals modal and update last visit
  function handleCloseDeals() {
    setShowDealsModal(false)
    updateLastVisit()
  }

  // Stats for sharing
  const shareStats = {
    receiptsCount: receipts?.length || 0,
    productsCount: products?.length || 0,
    inflation: null // Could calculate from productsWithHistory
  }

  // Clear messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  return (
    <div className="min-h-screen pb-24">
      <Header 
        productCount={products?.length || 0} 
        communityStats={communityStats}
        onSettingsClick={() => setView('settings')}
      />

      <main className="px-5 py-5">
        {view === 'home' && (
          <HomeView
            receipts={receipts || []}
            priceChanges={priceChanges}
            communityStats={communityStats}
            onViewReceipt={(r) => { setCurrentReceipt(r); setView('receipt') }}
            onViewProducts={() => setView('products')}
            onViewChange={(change) => viewProductDetail(change.code)}
            onViewInflation={() => setView('inflation')}
            onViewShare={() => setView('share')}
          />
        )}

        {view === 'scanner' && (
          <Scanner onScan={handleScan} onClose={() => setView('home')} />
        )}

        {view === 'receipt' && currentReceipt && (
          <ReceiptView
            receipt={currentReceipt}
            onClose={() => { setCurrentReceipt(null); setView('home') }}
            onProductClick={viewProductDetail}
          />
        )}

        {view === 'products' && (
          <ProductsView
            products={products || []}
            onProductClick={viewProductDetail}
            onClose={() => setView('home')}
          />
        )}

        {view === 'product-detail' && selectedProduct && (
          <ProductDetailView
            product={selectedProduct}
            onClose={() => { setSelectedProduct(null); setView('products') }}
          />
        )}

        {view === 'community' && (
          <CommunityView
            onProductClick={viewCommunityProductDetail}
            onClose={() => setView('home')}
          />
        )}

        {view === 'community-product-detail' && selectedCommunityProduct && (
          <CommunityProductDetail
            productCode={selectedCommunityProduct}
            onClose={() => { setSelectedCommunityProduct(null); setView('community') }}
          />
        )}

        {view === 'shopping-list' && (
          <ShoppingListView onClose={() => setView('home')} />
        )}

        {view === 'favorites' && (
          <FavoritesView 
            onClose={() => setView('home')}
            onViewProducts={() => setView('products')}
            onViewProduct={viewProductDetail}
          />
        )}

        {view === 'inflation' && (
          <InflationDashboard
            localProducts={productsWithHistory}
            onClose={() => setView('home')}
          />
        )}

        {view === 'share' && (
          <ShareCard stats={shareStats} onClose={() => setView('home')} />
        )}
        
        {view === 'settings' && (
          <SettingsView
            settings={settings}
            onToggle={toggleSetting}
            communityStats={communityStats}
            onClose={() => setView('home')}
          />
        )}
      </main>

      {/* Deals Modal - shows on app open */}
      {showDealsModal && (
        <DealsModal
          onClose={handleCloseDeals}
          onViewDeal={viewCommunityProductDetail}
        />
      )}

      {/* Success Animation after scan */}
      <SuccessAnimation
        show={showSuccessAnimation}
        message={successData?.message}
        subMessage={successData?.subMessage}
        onComplete={() => {
          setShowSuccessAnimation(false)
          setView('receipt')
        }}
      />

      {loading && <LoadingOverlay message="Učitavanje računa..." />}
      {error && <Toast message={error} type="error" onClose={() => setError(null)} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess(null)} />}

      <Navigation view={view} onNavigate={handleNavigate} favoritesCount={favorites?.length || 0} />
    </div>
  )
}
