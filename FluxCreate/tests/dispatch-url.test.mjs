import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatchURL} from '../server/dispatch-url.mjs';
test('hosted rewrite retains the signed media ticket and other API parameters',()=>{
 assert.equal(dispatchURL('/api/dispatch?app=fluxlab&path=video%2Fcontent&ticket=signed.payload'),'/api/fluxlab/video/content?ticket=signed.payload');
 assert.equal(dispatchURL('/api/dispatch?app=fluxlab&path=models'),'/api/fluxlab/models');
 assert.equal(dispatchURL('/api/fluxlab/video/content?ticket=original'),'/api/fluxlab/video/content?ticket=original');
 assert.equal(dispatchURL('/api/dispatch?app=fluxlab&path=video%2Fcontent&ticket=a%2Bb%3D&download=1'),'/api/fluxlab/video/content?ticket=a%2Bb%3D&download=1');
});
