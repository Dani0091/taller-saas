#!/usr/bin/env node
'use strict';

// pg_dump reads production; this script never invokes a restore or deletes old backups.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

function run(command, args, env) {
  const result = spawnSync(command, args, { env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  // Do not echo subprocess diagnostics: they can contain connection information.
  if (result.error || result.status !== 0) throw new Error(`${command} falló (${result.status ?? 'no disponible'}). No se publica una copia válida.`);
  return result.stdout;
}

function main() {
  const env = { ...process.env };
  if (env.BACKUP_ENV_FILE) {
    Object.assign(env, require('node:util').parseEnv(fs.readFileSync(env.BACKUP_ENV_FILE, 'utf8')));
  }
  for (const key of ['PGHOST', 'PGPORT', 'PGUSER', 'PGDATABASE', 'PGPASSWORD']) {
    if (!env[key]) throw new Error(`Falta ${key}. Usa conexión directa o session pooler; no claves API.`);
  }
  if (env.PGPORT !== '5432') throw new Error('Se requiere puerto 5432 (directo/session pooler); no transaction pooler.');
  env.PGSSLMODE = 'require';
  env.PGCONNECT_TIMEOUT = '20';
  const schemas = (env.BACKUP_SCHEMAS || 'public,auth,storage,supabase_migrations').split(',');
  if (schemas.some(s => !/^[a-z_][a-z0-9_]*$/.test(s))) throw new Error('BACKUP_SCHEMAS inválido.');
  if (env.CI && !env.BACKUP_ENCRYPTION_PASSWORD) throw new Error('CI requiere BACKUP_ENCRYPTION_PASSWORD.');
  const root = path.resolve(env.BACKUP_DIR || 'backups/supabase');
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const id = `taller-saas_${new Date().toISOString().replace(/[:.]/g, '-')}_${crypto.randomBytes(4).toString('hex')}`;
  const pending = path.join(root, `.${id}.partial`);
  const completed = path.join(root, id);
  fs.mkdirSync(pending, { mode: 0o700 });
  const dump = path.join(pending, 'database.dump');
  run('pg_dump', ['--no-password', '--format=custom', '--lock-wait-timeout=30s', ...schemas.flatMap(s => ['--schema', s]), '--file', dump], env);
  if (fs.statSync(dump).size < 100) throw new Error('Archivo vacío o demasiado pequeño.');
  const toc = run('pg_restore', ['--list', dump], env);
  if (!/TABLE DATA public /.test(toc) || !/TABLE public /.test(toc)) throw new Error('La copia no contiene esquema y datos de public.');
  // Read/decompress the whole archive, without executing any SQL or connecting to a DB.
  run('pg_restore', ['--file', path.join(pending, 'validation.sql'), dump], env);
  fs.unlinkSync(path.join(pending, 'validation.sql'));
  let artifact = dump;
  if (env.BACKUP_ENCRYPTION_PASSWORD) {
    artifact = `${dump}.enc`;
    const options = ['-aes-256-cbc', '-pbkdf2', '-iter', '200000', '-pass', 'env:BACKUP_ENCRYPTION_PASSWORD'];
    run('openssl', ['enc', ...options, '-salt', '-in', dump, '-out', artifact], env);
    const verification = path.join(pending, 'verification.dump');
    run('openssl', ['enc', '-d', ...options, '-in', artifact, '-out', verification], env);
    const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (digest(dump) !== digest(verification)) throw new Error('El cifrado no supera la verificación.');
    fs.unlinkSync(verification);
    fs.unlinkSync(dump);
  }
  fs.chmodSync(artifact, 0o600);
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(artifact)).digest('hex');
  fs.writeFileSync(path.join(pending, 'manifest.json'), JSON.stringify({
    timestamp: new Date().toISOString(), file: path.basename(artifact), bytes: fs.statSync(artifact).size,
    sha256, schemas, encrypted: Boolean(env.BACKUP_ENCRYPTION_PASSWORD),
    pgDumpVersion: run('pg_dump', ['--version'], env).trim(),
    validation: 'archive fully read; encryption roundtrip verified when enabled; restoration not tested',
    exclusions: ['Storage object files', 'global roles/passwords', 'project settings', 'Edge Functions', 'schemas outside BACKUP_SCHEMAS', 'Vault encryption root key'],
  }, null, 2), { mode: 0o600 });
  fs.renameSync(pending, completed);
  console.log(`Copia verificada: ${completed}`);
}

try { main(); } catch (error) {
  console.error(error.message);
  console.error('La carpeta .partial, si existe, no es un backup válido; puede contener datos sensibles.');
  process.exitCode = 1;
}
