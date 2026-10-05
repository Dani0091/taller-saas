const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const script = path.join(__dirname, 'backup-supabase.cjs');

function fixture(t, extra = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'taller-backup-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'pg_dump'), `#!/usr/bin/env node
const fs = require('fs');
if (process.argv.includes('--version')) { console.log('pg_dump fixture'); process.exit(0); }
if (process.env.FAIL_DUMP) process.exit(1);
fs.writeFileSync(process.argv[process.argv.indexOf('--file') + 1], Buffer.alloc(2048, 65));
`, { mode: 0o700 });
  fs.writeFileSync(path.join(bin, 'pg_restore'), `#!/usr/bin/env node
if (process.env.FAIL_RESTORE) process.exit(1);
if (process.argv.includes('--list')) console.log(process.env.BAD_TOC ? 'empty' : 'TABLE public clientes\\nTABLE DATA public clientes');
else require('fs').writeFileSync(process.argv[process.argv.indexOf('--file') + 1], '-- fixture');
`, { mode: 0o700 });
  const dir = path.join(root, 'backups');
  const env = { PATH: `${bin}:${process.env.PATH}`, PGHOST: 'fixture', PGPORT: '5432', PGUSER: 'postgres', PGDATABASE: 'postgres', PGPASSWORD: 'fixture-secret', BACKUP_DIR: dir, ...extra };
  return { dir, env, run: () => spawnSync(process.execPath, [script], { env, encoding: 'utf8' }) };
}

test('publishes only after archive validation, with real encryption roundtrip', t => {
  const f = fixture(t, { CI: 'true', BACKUP_ENCRYPTION_PASSWORD: 'fixture-encryption-secret' });
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  const dirs = fs.readdirSync(f.dir);
  assert.equal(dirs.length, 1);
  assert.ok(!dirs[0].startsWith('.'));
  const files = fs.readdirSync(path.join(f.dir, dirs[0])).sort();
  assert.deepEqual(files, ['database.dump.enc', 'manifest.json']);
  const manifest = JSON.parse(fs.readFileSync(path.join(f.dir, dirs[0], 'manifest.json')));
  assert.equal(manifest.encrypted, true);
  assert.match(manifest.sha256, /^[a-f0-9]{64}$/);
});

for (const failure of ['FAIL_DUMP', 'FAIL_RESTORE', 'BAD_TOC']) {
  test(`${failure} cannot publish a completed backup or leak credentials`, t => {
    const f = fixture(t, { [failure]: '1' });
    const result = f.run();
    assert.equal(result.status, 1);
    assert.ok(fs.readdirSync(f.dir).every(s => s.startsWith('.') && s.endsWith('.partial')));
    assert.ok(!`${result.stdout}${result.stderr}`.includes('fixture-secret'));
  });
}

test('CI rejects missing encryption before dumping', t => {
  const f = fixture(t, { CI: 'true' });
  assert.equal(f.run().status, 1);
  assert.ok(!fs.existsSync(f.dir));
});
test('rejects transaction pooler', t => {
  const f = fixture(t, { PGPORT: '6543' });
  assert.equal(f.run().status, 1);
  assert.ok(!fs.existsSync(f.dir));
});
