#!/bin/bash

# Script para ayudar a encontrar y verificar los cambios necesarios
# para corregir inconsistencias de tipos en DecimalInput

echo "🔍 Buscando usos de DecimalInput en los archivos afectados..."
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "📄 Archivo 1: src/app/dashboard/vehiculos/nuevo/page.tsx"
echo "═══════════════════════════════════════════════════════════════"
grep -n "DecimalInput" src/app/dashboard/vehiculos/nuevo/page.tsx | head -20
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "📄 Archivo 2: src/components/dashboard/ordenes/detalle-orden-sheet.tsx"
echo "═══════════════════════════════════════════════════════════════"
grep -n "DecimalInput" src/components/dashboard/ordenes/detalle-orden-sheet.tsx | head -30
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "📄 Archivo 3: src/components/ordenes/editar-orden-sheet.tsx"
echo "═══════════════════════════════════════════════════════════════"
grep -n "DecimalInput" src/components/ordenes/editar-orden-sheet.tsx | head -10
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "🔍 Buscando estados con campos que pueden necesitar conversión..."
echo "═══════════════════════════════════════════════════════════════"

echo ""
echo "Campos 'año' en estados:"
grep -n "año:" src/app/dashboard/vehiculos/nuevo/page.tsx src/components/dashboard/ordenes/detalle-orden-sheet.tsx | grep "''" || echo "  (buscar manualmente)"

echo ""
echo "Campos 'kilometros' en estados:"
grep -n "kilometros:" src/app/dashboard/vehiculos/nuevo/page.tsx src/components/dashboard/ordenes/detalle-orden-sheet.tsx | grep "''" || echo "  (buscar manualmente)"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📋 Resumen de búsqueda completado"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Consulta el archivo FIX-TYPESCRIPT-DECIMAL-INPUT.md para ver"
echo "los cambios específicos que necesitas aplicar en cada línea."
echo ""
echo "Después de aplicar los cambios, ejecuta:"
echo "  1. npx tsc --noEmit     (verificar tipos)"
echo "  2. npm run build        (build completo)"
echo ""
