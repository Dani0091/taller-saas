// Solo GET y cuerpos vacíos que fallan antes de cualquier escritura o envío externo.
const fs = require('node:fs');
const checks = [
 ['GET','/auth/login',200],['GET','/auth/registro',200],['GET','/auth/recuperar',200],
 ['GET','/dashboard/ordenes',200],
 ...['ordenes','vehiculos','citas','diagnostico','series/obtener','taller/plan','configuracion/api-keys','calendar/google/status'].map(x=>['GET','/api/'+x,401]),
 ...['facturas/crear','facturas/desde-orden','facturas/emitir','facturas/cobro-rapido','facturas/rapida'].map(x=>['POST','/api/'+x,401]),
 ...['clientes/crear','ordenes/compartir','factura/lineas/agregar','facturas/generar-verifactu','taller/config/actualizar'].map(x=>['POST','/api/'+x,401]),
 ['GET','/api/clientes',401],['GET','/api/facturas/detalles',401],['GET','/api/config/sistema',200],
 ['GET','/api/image/proxy?url=https%3A%2F%2Fexample.com%2Fx.jpg',403],
 ['GET','/api/facturas/DISABLED_obtener',404],['GET','/dashboard/facturas/DISABLED_generar',404]
];
(async()=>{const results=[];for(const [method,path,expected]of checks){try{const started=Date.now();const r=await fetch('http://127.0.0.1:3100'+path,{method,redirect:'manual',...(method==='POST'?{headers:{'Content-Type':'application/json'},body:'{}'}:{}),signal:AbortSignal.timeout(15000)});results.push({method,path,expected,status:r.status,pass:r.status===expected,ms:Date.now()-started,headers:{frame:r.headers.get('x-frame-options'),nosniff:r.headers.get('x-content-type-options'),csp:r.headers.get('content-security-policy')}});await r.body?.cancel()}catch(e){results.push({method,path,expected,error:e.name,pass:false})}}fs.writeFileSync(__dirname+'/evidencias/smoke-http.json',JSON.stringify(results,null,2));console.log(JSON.stringify({checks:results.length,pass:results.filter(x=>x.pass).length,fail:results.filter(x=>!x.pass)},null,2))})()
