'use client'

import { Card } from '@/components/ui/card'
import { Car, TrendingUp, Clock, Flame } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Bienvenido a TallerAgil</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">ORs Hoy</p>
              <p className="text-3xl font-bold">7</p>
            </div>
            <Car className="w-10 h-10 opacity-50" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Facturado Hoy</p>
              <p className="text-3xl font-bold">2.4K€</p>
            </div>
            <TrendingUp className="w-10 h-10 opacity-50" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">En Proceso</p>
              <p className="text-3xl font-bold">5</p>
            </div>
            <Clock className="w-10 h-10 opacity-50" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Racha</p>
              <p className="text-3xl font-bold">12 días</p>
            </div>
            <Flame className="w-10 h-10 opacity-50" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Próximos pasos</h2>
        <ul className="space-y-2 text-gray-600">
          <li>✅ Crear órdenes de reparación</li>
          <li>✅ Gestionar clientes y vehículos</li>
          <li>✅ Generar facturas</li>
        </ul>
      </Card>
    </div>
  )
}
