'use client'

import { MessageCircle } from 'lucide-react'

export function WhatsAppLink({ telefono }: { telefono: string }) {
  if (!telefono) return null
  
  const numero = telefono.replace(/\D/g, '')
  
  const handleClick = () => {
    const url = `https://wa.me/${numero}`
    window.open(url, '_blank')
  }
  
  return (
    <button
      type="button"
      onClick={handleClick}
      title="Enviar WhatsApp"
      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all flex items-center justify-center"
    >
      <MessageCircle className="w-5 h-5" />
    </button>
  )
}
