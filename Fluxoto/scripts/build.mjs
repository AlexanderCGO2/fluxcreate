import {copyFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {buildApp} from '../../FluxCreate/scripts/build.mjs';
await buildApp(new URL('../',import.meta.url));

const require = createRequire(import.meta.url);
const license = join(dirname(require.resolve('ag-psd/package.json')), 'LICENSE');
await copyFile(license, new URL('../dist/AG-PSD-LICENSE.txt', import.meta.url));
