import test from 'node:test';
import assert from 'node:assert/strict';
import {includeReleasePath} from '../scripts/release-files.mjs';
test('release copy excludes nested credentials and runtime artifacts on both path styles',()=>{
 for(const value of ['server/.env','scripts/demo/.env.production','server/hosted-bundle.mjs','src/.runtime-check/token.json','server/.data/connection-secret','docs/.vercel/project.json','tests/.test-data/record.json','server-dist/index.mjs','src/key.pem','src/identity.key','src/data.sqlite-wal','server/request.log','docs/private.har','src/.aws/credentials'])
  for(const candidate of [value,value.replaceAll('/','\\')])assert.equal(includeReleasePath(candidate),false,candidate);
});
test('release copy keeps normal source, docs and public assets',()=>{
 for(const value of ['src/main.jsx','server/settings.mjs','scripts/release-files.mjs','docs/CONNECTION_SETTINGS.md','public/example.flux.md','tests/settings.test.mjs','src/keyboard.mjs',''])assert.equal(includeReleasePath(value),true,value);
});
