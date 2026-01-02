import { useState } from 'react'
import { Icons } from './Icons'

export default function ProductsView({ products, onProductClick, onClose }) {
  const [searchQuery, setSearchQuery] = useState('')
  
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.includes(searchQuery)
  )

  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <button
        onClick={onClose}
        className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors mb-4 text-sm"
      >
        <Icons.ChevronLeft className="w-4 h-4" />
        Nazad
      </button>

      {/* Search */}
      <div className="bg-dark-800 rounded-xl p-3 flex items-center gap-3 mb-4 border border-white/5">
        <Icons.Search className="text-dark-400" />
        <input
          type="text"
          placeholder="Pretraži proizvode..."
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

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <EmptyState 
          icon={<Icons.Package className="w-8 h-8" />}
          title={searchQuery ? "Nema rezultata" : "Nema proizvoda"}
          description={searchQuery 
            ? "Pokušajte sa drugim pojmom za pretragu" 
            : "Skenirajte račune da biste dodali proizvode"
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredProducts.map((product, i) => (
            <div
              key={product.id}
              onClick={() => onProductClick(product.code)}
              className="bg-dark-800 rounded-xl p-4 border border-white/5 hover:bg-dark-700 transition-colors cursor-pointer"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex justify-between items-center">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-medium truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-dark-400 font-mono mt-1">
                    {product.code}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[15px] font-semibold font-mono text-cyan-400">
                    {product.latestPrice?.toFixed(2)} €
                  </p>
                  <Icons.ChevronRight className="text-dark-500" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="bg-dark-800 rounded-2xl p-10 text-center border border-dashed border-dark-600">
      <div className="w-16 h-16 rounded-2xl bg-dark-700 flex items-center justify-center mx-auto mb-4 text-dark-400">
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <p className="text-sm text-dark-400 max-w-[240px] mx-auto">
        {description}
      </p>
    </div>
  )
}
