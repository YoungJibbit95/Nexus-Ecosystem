const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createWorkspaceTrustStore } = require('./workspaceTrustStore.cjs');

function fixture(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-trust-test-')));
  t.after(() => {
    // Tests own these regular files/directories only; reject unexpected links.
    const remove = (target) => {
      assert.ok(target.startsWith(`${dir}${path.sep}`) || target === dir);
      const stat = fs.lstatSync(target);
      if (stat.isSymbolicLink()) fs.unlinkSync(target);
      else if (stat.isDirectory()) { for (const name of fs.readdirSync(target)) remove(path.join(target, name)); fs.rmdirSync(target); }
      else fs.unlinkSync(target);
    };
    remove(dir);
  });
  const root = path.join(dir, 'workspace'); fs.mkdirSync(root);
  const profile = path.join(dir, 'profile');
  const create = () => createWorkspaceTrustStore({ getUserDataPath: () => profile });
  const grant = (store) => store.grant(root, store.getRevision(), store.identity(root));
  return { dir, root, profile, create, grant, filename: path.join(profile, 'secure/workspace-trust-v1.json') };
}

test('unknown roots deny, explicit decisions persist and revoke invalidates pending permits', t => {
  const f = fixture(t), store = f.create();
  assert.equal(store.status(f.root).trusted, false);
  assert.throws(() => store.assertTrusted(f.root), /WORKSPACE_TRUST_REQUIRED/);
  const before = store.getRevision();
  f.grant(store);
  assert.equal(f.create().status(f.root).trusted, true);
  assert.throws(() => store.assertTrusted(f.root, before), /WORKSPACE_TRUST_REQUIRED/);
  let stopped = false;
  store.revoke(f.root, () => { stopped = true; assert.equal(store.status(f.root).trusted, false); });
  assert.equal(stopped, true);
  assert.equal(f.create().status(f.root).trusted, false);
  assert.throws(() => store.grant(f.root, before, store.identity(f.root)), /WORKSPACE_TRUST_REQUIRED/);
});

test('replaced directory does not inherit trust or pending native approval', t => {
  const f = fixture(t), store = f.create(); f.grant(store);
  const oldIdentity = store.identity(f.root);
  fs.renameSync(f.root, `${f.root}-old`); fs.mkdirSync(f.root);
  assert.equal(store.status(f.root).trusted, false);
  assert.equal(f.create().status(f.root).trusted, false);
  assert.throws(() => store.grant(f.root, store.getRevision(), oldIdentity), /WORKSPACE_TRUST_REQUIRED/);
});

test('corrupt/unknown storage fails closed and remains byte-for-byte unchanged', t => {
  const f = fixture(t); f.grant(f.create());
  for (const body of ['{', '{"version":2,"roots":[]}', '{"version":1,"roots":[{"path":"relative","identity":"1:2:3"}]}']) {
    fs.writeFileSync(f.filename, body);
    const store = f.create();
    assert.equal(store.status(f.root).storageError, true);
    assert.equal(store.status(f.root).trusted, false);
    assert.throws(() => f.grant(store), /STORAGE_UNAVAILABLE/);
    assert.equal(fs.readFileSync(f.filename, 'utf8'), body);
  }
});

test('security metadata and ancestors cannot be mutated, ordinary files remain writable', t => {
  const f = fixture(t), store = f.create();
  for (const target of [f.filename, path.dirname(f.filename), f.profile, f.dir, path.parse(f.dir).root]) {
    assert.throws(() => store.assertWritable(target), /Protected application security metadata/);
  }
  store.assertWritable(path.join(f.root, 'ordinary.txt'));
});

test('failed revocation persistence still denies execution and stops sessions', t => {
  const f = fixture(t), store = f.create(); f.grant(store);
  fs.unlinkSync(f.filename); fs.mkdirSync(f.filename);
  let stopped = false;
  assert.throws(() => store.revoke(f.root, () => { stopped = true; }), /STORAGE_UNAVAILABLE/);
  assert.equal(stopped, true);
  assert.equal(store.status(f.root).trusted, false);
});
