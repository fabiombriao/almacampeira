'use client'

import { useEffect, useState } from 'react'

/** Abre o WhatsApp automaticamente logo após criar o pedido (?wa=1) e oferece botões de apoio. */
export function OrderActions({ whatsappUrl, message }: { whatsappUrl: string; message: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('wa') !== '1') return
    // remove ?wa=1 do histórico para que "voltar" do WhatsApp não reabra tudo de novo
    window.history.replaceState(null, '', window.location.pathname)
    window.location.assign(whatsappUrl)
  }, [whatsappUrl])

  async function copy() {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      window.prompt('Copie a mensagem abaixo:', message)
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
        Abrir WhatsApp
      </a>
      <button type="button" className="btn btn-outline" onClick={copy}>
        {copied ? 'Mensagem copiada ✓' : 'Copiar mensagem'}
      </button>
    </div>
  )
}
