import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanSettings,safeParse} from '../src/validation.mjs';
test('valid bounded updates',()=>{assert.deepEqual(cleanSettings({level:10,trajectory:'infinity',soundActive:false}),{level:10,trajectory:'infinity',soundActive:false});});
test('rejects invalid controls',()=>{for(const value of [{level:0},{level:99},{dotSize:500},{bg:'javascript:alert(1)'},{stimulus:'<img>'},{soundActive:1}])assert.throws(()=>cleanSettings(value));});
test('rejects oversized messages',()=>assert.throws(()=>safeParse('a'.repeat(5000))));
