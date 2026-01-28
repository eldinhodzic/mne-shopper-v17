import { useState } from 'react'
import { Icons } from './Icons'
import { useLanguage } from '../hooks/useLanguage'

export default function ShareCard({ stats, onClose }) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)

  const shareText = `🛒 MNE Cjenovnik

📊 ${t('home.receipts')}: ${stats.receiptsCount}
📦 ${t('common.products')}: ${stats.productsCount}
${stats.inflation ? `📈 ${t('home.inflation')}: ${stats.inflation > 0 ? '+' : ''}${stats.inflation}%` : ''}

${t('share.download')}: mne-cjenovnik.vercel.app
#MNECjenovnik #CrnaGora`

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'MNE Cjenovnik', text: shareText, url: 'https://mne-cjenovnik.vercel.app' })
      } catch (err) {
        if (err.name !== 'AbortError') copyToClipboard()
      }
    } else {
      copyToClipboard()
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="animate-fade-in">
      <button onClick={onClose} className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors mb-4 text-sm">
        <Icons.ChevronLeft className="w-4 h-4" />
        {t('common.back')}
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
          <Icons.Share className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Podijeli</h1>
          <p className="text-xs text-dark-400">Pohvali se statistikom</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl p-6 border border-white/10 mb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <span className="text-2xl">🛒</span>
          </div>
          <div>
            <h3 className="font-bold text-lg">MNE Cjenovnik</h3>
            <p className="text-xs text-dark-400">Moja statistika</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/20 text-center">
            <span className="text-2xl mb-1 block">📊</span>
            <p className="text-xl font-bold font-mono">{stats.receiptsCount}</p>
            <p className="text-xs text-dark-400">Računa</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 rounded-xl p-4 border border-cyan-500/20 text-center">
            <span className="text-2xl mb-1 block">📦</span>
            <p className="text-xl font-bold font-mono">{stats.productsCount}</p>
            <p className="text-xs text-dark-400">Proizvoda</p>
          </div>
        </div>

        <div className="text-center pt-4 border-t border-white/5">
          <p className="text-xs text-dark-400">mne-cjenovnik.vercel.app</p>
        </div>
      </div>

      <div className="space-y-3">
        <button onClick={handleShare} className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold flex items-center justify-center gap-2">
          <Icons.Share className="w-5 h-5" />
          {copied ? 'Kopirano!' : 'Podijeli'}
        </button>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')} className="py-3 rounded-xl bg-dark-800 border border-white/5 flex flex-col items-center gap-1 hover:bg-green-500/20 hover:border-green-500/30 transition-colors">
            <span className="text-xl">📱</span>
            <span className="text-xs text-dark-400">WhatsApp</span>
          </button>
          <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(shareText)}`, '_blank')} className="py-3 rounded-xl bg-dark-800 border border-white/5 flex flex-col items-center gap-1 hover:bg-blue-500/20 hover:border-blue-500/30 transition-colors">
            <span className="text-xl">📘</span>
            <span className="text-xs text-dark-400">Facebook</span>
          </button>
          <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank')} className="py-3 rounded-xl bg-dark-800 border border-white/5 flex flex-col items-center gap-1 hover:bg-cyan-500/20 hover:border-cyan-500/30 transition-colors">
            <span className="text-xl">🐦</span>
            <span className="text-xs text-dark-400">Twitter</span>
          </button>
        </div>
      </div>
    </div>
  )
}
