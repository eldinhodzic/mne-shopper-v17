import { Icons } from './Icons'
import { useLanguage } from '../hooks/useLanguage'

export default function ReceiptView({ receipt, onClose, onProductClick }) {
  const { t } = useLanguage()
  const date = new Date(receipt.date)
  
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

      {/* Receipt Header */}
      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-white/70 mb-1">{t('receipt.store')}</p>
            <h2 className="text-xl font-bold">{receipt.store}</h2>
            {receipt.storeAddress && (
              <p className="text-sm text-white/70 mt-1">{receipt.storeAddress}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-white/70 mb-1">{t('receipt.total')}</p>
            <p className="text-2xl font-bold font-mono">
              {receipt.total?.toFixed(2)} €
            </p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-4 text-sm text-white/80">
          <span className="flex items-center gap-1.5">
            <Icons.Calendar />
            {date.toLocaleDateString('sr-Latn-ME', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </span>
          <span>
            {date.toLocaleTimeString('sr-Latn-ME', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-dark-800 rounded-2xl overflow-hidden border border-white/5">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t('receipt.items')}</h3>
          <span className="text-sm text-dark-400">
            {receipt.items?.length || 0} {t('receipt.products')}
          </span>
        </div>

        <div className="divide-y divide-white/5">
          {receipt.items?.map((item, index) => (
            <div
              key={index}
              onClick={() => onProductClick(item.code)}
              className="p-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">
                    {item.name}
                  </p>
                  <p className="text-xs text-dark-400 mt-1">
                    {item.quantity} × {item.unitPriceAfterVat?.toFixed(2)} €
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold font-mono text-cyan-400">
                    {item.priceAfterVat?.toFixed(2)} €
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
