import Dexie from 'dexie'

export const db = new Dexie('MNECjenovnikDB')

db.version(1).stores({
  products: '++id, code, name, latestPrice, firstSeen, lastSeen',
  receipts: '++id, iic, date, store, total',
  priceHistory: '++id, code, price, date, store'
})

// Version 2: Add favorites and price alerts
db.version(2).stores({
  products: '++id, code, name, latestPrice, firstSeen, lastSeen',
  receipts: '++id, iic, date, store, total',
  priceHistory: '++id, code, price, date, store',
  favorites: '++id, code, addedAt',
  priceAlerts: '++id, code, targetPrice, createdAt, triggered'
})

// Product operations
export async function saveProduct(item, storeName, date) {
  // Validate item has required fields
  if (!item || !item.code || !item.name) {
    console.warn('Skipping invalid product:', item)
    return null
  }
  
  // Ensure code is a string
  const code = String(item.code).trim()
  if (!code || code === 'null' || code === 'undefined') {
    console.warn('Skipping product with invalid code:', item)
    return null
  }
  
  try {
    const existingProduct = await db.products.where('code').equals(code).first()
    
    if (existingProduct) {
      await db.products.update(existingProduct.id, {
        name: item.name,
        latestPrice: item.unitPriceAfterVat || 0,
        lastSeen: date
      })
    } else {
      await db.products.add({
        code: code,
        name: item.name,
        unit: item.unit || 'KOM',
        latestPrice: item.unitPriceAfterVat || 0,
        firstSeen: date,
        lastSeen: date
      })
    }
    
    // Add price history
    await db.priceHistory.add({
      code: code,
      name: item.name,
      price: item.unitPriceAfterVat || 0,
      date: date,
      store: storeName
    })
    
    return code
  } catch (error) {
    console.error('Error saving product:', error, item)
    return null
  }
}

// Get price changes
export async function getPriceChanges(limit = 10) {
  const history = await db.priceHistory.orderBy('date').reverse().toArray()
  const productPrices = {}
  
  history.forEach(record => {
    if (!productPrices[record.code]) {
      productPrices[record.code] = []
    }
    productPrices[record.code].push(record)
  })
  
  const changes = []
  
  for (const [code, prices] of Object.entries(productPrices)) {
    if (prices.length >= 2) {
      const latest = prices[0]
      const previous = prices[1]
      const diff = latest.price - previous.price
      
      if (Math.abs(diff) > 0.001) {
        const product = await db.products.where('code').equals(code).first()
        const percentChange = (diff / previous.price) * 100
        
        changes.push({
          code,
          name: product?.name || code,
          // New field names matching what PriceChangeCard expects
          newPrice: latest.price,
          oldPrice: previous.price,
          changePercent: percentChange,
          direction: diff > 0 ? 'up' : 'down',
          // Keep legacy fields for backward compatibility
          currentPrice: latest.price,
          previousPrice: previous.price,
          diff,
          percentChange: percentChange.toFixed(1),
          store: latest.store,
          date: latest.date
        })
      }
    }
  }
  
  return changes
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, limit)
}

// Get product with history
export async function getProductWithHistory(code) {
  const product = await db.products.where('code').equals(code).first()
  const history = await db.priceHistory
    .where('code')
    .equals(code)
    .reverse()
    .sortBy('date')
  
  return { ...product, history }
}

// Clear all data (for testing)
export async function clearAllData() {
  await db.products.clear()
  await db.receipts.clear()
  await db.priceHistory.clear()
  await db.favorites.clear()
  await db.priceAlerts.clear()
}

// ==================== FAVORITES ====================

// Add product to favorites
export async function addToFavorites(code) {
  const existing = await db.favorites.where('code').equals(code).first()
  if (existing) return existing.id
  
  return await db.favorites.add({
    code,
    addedAt: new Date()
  })
}

// Remove product from favorites
export async function removeFromFavorites(code) {
  await db.favorites.where('code').equals(code).delete()
  // Also remove any alerts for this product
  await db.priceAlerts.where('code').equals(code).delete()
}

// Check if product is favorite
export async function isFavorite(code) {
  const fav = await db.favorites.where('code').equals(code).first()
  return !!fav
}

// Get all favorites with product details and price history
export async function getFavoritesWithDetails() {
  const favorites = await db.favorites.orderBy('addedAt').reverse().toArray()
  
  const results = await Promise.all(favorites.map(async (fav) => {
    const product = await db.products.where('code').equals(fav.code).first()
    if (!product) return null
    
    const history = await db.priceHistory
      .where('code')
      .equals(fav.code)
      .reverse()
      .sortBy('date')
    
    const alert = await db.priceAlerts.where('code').equals(fav.code).first()
    
    // Calculate price change
    let priceChange = null
    if (history.length >= 2) {
      const latest = history[0]
      const previous = history[1]
      const diff = latest.price - previous.price
      const percentChange = (diff / previous.price) * 100
      
      priceChange = {
        diff,
        percentChange,
        direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
        oldPrice: previous.price,
        newPrice: latest.price,
        oldStore: previous.store,
        newStore: latest.store,
        date: latest.date
      }
    }
    
    return {
      ...product,
      history,
      alert,
      priceChange,
      addedAt: fav.addedAt
    }
  }))
  
  return results.filter(r => r !== null)
}

// ==================== PRICE ALERTS ====================

// Set price alert for a product
export async function setPriceAlert(code, targetPrice) {
  // Remove existing alert for this product
  await db.priceAlerts.where('code').equals(code).delete()
  
  return await db.priceAlerts.add({
    code,
    targetPrice,
    createdAt: new Date(),
    triggered: false
  })
}

// Remove price alert
export async function removePriceAlert(code) {
  await db.priceAlerts.where('code').equals(code).delete()
}

// Get alert for a product
export async function getPriceAlert(code) {
  return await db.priceAlerts.where('code').equals(code).first()
}

// Check all alerts and mark triggered ones
export async function checkPriceAlerts() {
  const alerts = await db.priceAlerts.where('triggered').equals(false).toArray()
  const triggered = []
  
  for (const alert of alerts) {
    const product = await db.products.where('code').equals(alert.code).first()
    if (product && product.latestPrice <= alert.targetPrice) {
      await db.priceAlerts.update(alert.id, { triggered: true })
      triggered.push({
        ...alert,
        product,
        currentPrice: product.latestPrice
      })
    }
  }
  
  return triggered
}

// Get all triggered alerts (for showing notifications)
export async function getTriggeredAlerts() {
  const alerts = await db.priceAlerts.where('triggered').equals(true).toArray()
  
  const results = await Promise.all(alerts.map(async (alert) => {
    const product = await db.products.where('code').equals(alert.code).first()
    return {
      ...alert,
      product
    }
  }))
  
  return results.filter(r => r.product)
}
