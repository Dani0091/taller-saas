#!/bin/bash
# Script de rescate para arreglar el problema del proxy en Next.js 16

set -e

echo "🔧 INICIANDO FIX DEL PROXY..."
echo ""

# Paso 1: Detener todos los procesos
echo "1️⃣ Deteniendo procesos de Next.js..."
pkill -9 node 2>/dev/null || true
pkill -9 -f "next dev" 2>/dev/null || true
sleep 2

# Paso 2: Traer cambios del repositorio
echo "2️⃣ Trayendo cambios del repositorio..."
git fetch origin
git reset --hard origin/claude/refactor-saas-architecture-5fW7k

# Paso 3: Verificar ubicación del archivo
echo "3️⃣ Verificando ubicación de proxy.ts..."
if [ -f "proxy.ts" ]; then
    echo "   ✅ proxy.ts encontrado en raíz"
else
    echo "   ❌ ERROR: proxy.ts NO está en la raíz"
    exit 1
fi

if [ -f "src/proxy.ts" ]; then
    echo "   ⚠️  ADVERTENCIA: proxy.ts encontrado en src/ - eliminando..."
    rm -f src/proxy.ts
fi

if [ -f "middleware.ts" ] || [ -f "src/middleware.ts" ]; then
    echo "   ⚠️  ADVERTENCIA: middleware.ts encontrado - eliminando..."
    rm -f middleware.ts src/middleware.ts
fi

# Paso 4: Limpiar cache COMPLETO
echo "4️⃣ Limpiando cache completo..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf /tmp/next-*
echo "   ✅ Cache eliminado"

# Paso 5: Verificar dependencias
echo "5️⃣ Verificando dependencias..."
if [ ! -d "node_modules" ]; then
    echo "   📦 Instalando dependencias..."
    npm install
fi

# Paso 6: Verificar contenido del proxy.ts
echo "6️⃣ Verificando contenido de proxy.ts..."
if grep -q "export default async function proxy" proxy.ts; then
    echo "   ✅ proxy.ts tiene export correcto"
else
    echo "   ❌ ERROR: proxy.ts no tiene el export correcto"
    exit 1
fi

# Paso 7: Arrancar servidor
echo ""
echo "✅ TODO LISTO - Arrancando servidor..."
echo ""
echo "📍 El servidor debería iniciar en: http://localhost:3000"
echo ""

npm run dev
