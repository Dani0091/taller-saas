# Backups de TallerAgil en GitHub Actions

## Estado a 5 de octubre de 2026

Preparados el workflow `.github/workflows/backup-supabase.yml` y el script
`scripts/backup-supabase.cjs`. Pendiente configurar Secrets, publicar el workflow
en la rama predeterminada y ejecutar una copia real. Las pruebas locales con
herramientas simuladas no demuestran conectividad ni restauración de producción.

## Qué se ha corregido

Los adjuntos originales son material de referencia. No se ejecutan directamente:
`db pull` no es una copia de datos, redirigir sus logs a `.sql` no crea un backup,
`db push` no restaura un archivo por stdin y guardar datos en commits los deja en
el historial de Git. El Node original no esperaba el cierre de todos los streams.

Se usa `pg_dump` en formato custom, que incluye esquema y datos en una instantánea
consistente. Se verifica el índice y se lee/descomprime todo el archivo mediante
`pg_restore` sin conectar a una base. Después se cifra con OpenSSL AES-256-CBC,
PBKDF2 de 200000 iteraciones y salt aleatorio; se descifra una copia temporal y se
compara su SHA-256 con el original. Solo entonces se publica la carpeta completa.
Las copias fallidas quedan ocultas como `.partial` y nunca se suben como artifacts.
El script no restaura, no modifica tablas ni elimina copias anteriores. `pg_dump`
consume recursos y toma bloqueos de lectura; el timeout de bloqueos es 30 segundos.

## Activación

1. En Supabase, abre **Connect** del proyecto de TallerAgil y verifica su referencia
   contra la configuración de la aplicación. Los adjuntos indican
   `nimvxyhwjdfdlyjtofce`; comprueba que sigue siendo el proyecto correcto.
2. Copia el host y usuario del **Session pooler, puerto 5432**, o usa conexión
   directa si existe IPv6. No uses el transaction pooler de puerto 6543.
   La contraseña es la de PostgreSQL, no la clave service_role ni un token personal.
   No restablezcas la contraseña para este setup: podría afectar a otros servicios.
3. En [GitHub Secrets](https://github.com/Dani0091/taller-saas/settings/secrets/actions)
   crea `BACKUP_PGHOST`, `BACKUP_PGUSER`, `BACKUP_PGPASSWORD` y
   `BACKUP_ENCRYPTION_PASSWORD`. Esta última debe ser una contraseña larga y aleatoria;
   guarda una copia en tu gestor de contraseñas. Perderla impide recuperar los backups.
   La base configurada es `postgres`. SSL es obligatorio.
4. Publica únicamente los archivos del backup en una rama de trabajo y revisa el PR.
   El cron se activa en la rama predeterminada. Este repositorio despliega Railway
   al actualizar `main`: revisa las condiciones del despliegue antes de fusionar.
   No incluyas los cambios ajenos que ya estaban pendientes en el workspace.
5. Abre [Actions](https://github.com/Dani0091/taller-saas/actions), selecciona
   **Backup Supabase diario** y **Run workflow**. Verifica que ambos pasos terminan
   correctamente y existe `supabase-backup-<run_id>` con `.enc` y `manifest.json`.
6. Descarga una copia y verifica el SHA-256 indicado en el manifest con
   `shasum -a 256 database.dump.enc`. Ensaya una restauración en un destino aislado
   antes de considerar probado el plan de recuperación.

El horario es 02:00 UTC: 03:00 en invierno y 04:00 en verano en Madrid.
GitHub puede retrasar ejecuciones. Artifacts caducan a los 30 días y están sujetos
a cuotas y costes del plan; revisa almacenamiento y permisos del repositorio.
Las notificaciones de fallos dependen de tus preferencias de GitHub Actions:
actívalas y comprueba periódicamente que sigue habiendo ejecuciones recientes.

## Prueba local opcional

Requiere Node 24, `pg_dump`/`pg_restore` 18 y OpenSSL. El cliente debe ser de una
versión igual o posterior al servidor. Crea `.env.backup.local` (ya ignorado por Git)
con `PGHOST`, `PGPORT=5432`, `PGUSER`, `PGDATABASE=postgres`, `PGPASSWORD` y
`BACKUP_ENCRYPTION_PASSWORD`. No pongas estos valores en el chat ni en commits.

```bash
chmod 600 .env.backup.local
BACKUP_ENV_FILE=.env.backup.local node scripts/backup-supabase.cjs
node --test scripts/backup-supabase.test.cjs
```

Las copias locales están en `backups/supabase/` (ignorado por Git). Protege también
las carpetas `.partial` que puedan quedar tras un fallo; no son copias válidas.
No hay limpieza automática de copias locales.

## Alcance y recuperación

Incluye por defecto los esquemas `public`, `auth`, `storage` y `supabase_migrations`
que existan y sean accesibles al usuario de conexión. Para esquemas propios extra,
configura `BACKUP_SCHEMAS` en el workflow y verifica su presencia en la copia.
No incluye archivos binarios de Storage, roles globales/contraseñas, ajustes del
proyecto, código de Edge Functions ni la clave raíz de cifrado de Vault. Exporta
estos elementos por separado si se usan. Las claves de Vault pueden requerirse
para recuperar valores cifrados en un proyecto distinto.

Para descifrar, OpenSSL pedirá la contraseña sin escribirla en el comando:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in database.dump.enc -out database.dump
pg_restore --list database.dump
```

La validación del archivo **no demuestra que pueda restaurarse correctamente**.
En un PostgreSQL aislado se puede ensayar `pg_restore --exit-on-error --single-transaction
--no-owner --no-privileges --dbname DESTINO_AISLADO database.dump`; pueden faltar
roles, extensiones y servicios gestionados. El ensayo debe comprobar tablas,
recuentos, relaciones, RLS, usuarios y flujos de la aplicación. Restaurar en otro
proyecto Supabase exige revisar los objetos gestionados de Auth/Storage, roles,
grants y cifrado; no ejecutes el ejemplo directamente sobre producción.

Documentación oficial:
- [Backup y restauración](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Alcance de copias de Supabase](https://supabase.com/docs/guides/platform/backups)

## Registro de comprobaciones

- Sintaxis del script y pruebas locales de publicación, cifrado, fallo de dump,
  archivo inválido, fallo de lectura y rechazo de CI sin cifrado.
- Falta comprobar el primer run real y una restauración aislada.
- No se ha activado el cron ni cambiado la base de producción.
