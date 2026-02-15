import Dexie from 'dexie'

export const db = new Dexie('MNECjenovnikDB')

db.version(1).stores({
  products: '++id, code, name, latestPrice, firstSeen, lastSeen',
  receipts: '++id, iic, date, store, total',
  priceHistory: '++id, code, price, date, store'
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
}
