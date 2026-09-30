import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createI18n } from 'vue-i18n';
import MarkdownIt from 'markdown-it';
import { alertPlugin } from '../src/utils/markdown/markdown-it-alert.js';
import { describeImageMessage } from '../src/utils/image/messages.js';
import { normalizeLocale, detectLocale, readLocalePreference, writeLocalePreference, createLocaleSwitcher } from '../src/i18n/locale.js';

const require = createRequire(import.meta.url);
const { parse, compileScript, compileTemplate } = require('vue/compiler-sfc');
const codes = ['zh-CN', 'en', 'si'];
const messages = Object.fromEntries(codes.map(code => [code, JSON.parse(fs.readFileSync(`src/i18n/messages/${code}.json`, 'utf8'))]));
const flatten = (tree, prefix = '') => Object.entries(tree).flatMap(([key, value]) => typeof value === 'string' ? [[prefix + key, value]] : flatten(value, prefix + key + '.'));
const catalogs = Object.fromEntries(codes.map(code => [code, new Map(flatten(messages[code]))]));
const params = text => [...text.matchAll(/\{(p\d+)\}/g)].map(match => match[1]).sort();
const keys = [...catalogs['zh-CN'].keys()].sort();
const compilationErrors = [];
const oldError = console.error;
console.error = (...args) => compilationErrors.push(args.join(' '));
try {
  for (const code of codes) {
    assert.deepEqual([...catalogs[code].keys()].sort(), keys, `${code}: message keys`);
    const i18n = createI18n({ legacy: false, locale: code, messages, fallbackLocale: 'zh-CN' });
    for (const [key, message] of catalogs[code]) {
      assert.deepEqual(params(message), params(catalogs['zh-CN'].get(key)), `${code}: ${key} parameters`);
      assert.ok(message.trim(), `${code}: ${key} empty translation`);
      const args = Object.fromEntries(params(message).map(name => [name, 'sample']));
      assert.notEqual(i18n.global.t(key, args), key, `${code}: ${key} did not compile`);
    }
    i18n.dispose();
  }
} finally { console.error = oldError; }
assert.deepEqual(compilationErrors, [], 'Message compilation errors');

let components = 0;
for (const file of fs.readdirSync('src', { recursive: true }).filter(file => file.endsWith('.vue') && !/^views[\\/]test[\\/]|^views[\\/]Test.vue/.test(file))) {
  const source = fs.readFileSync('src/' + file, 'utf8');
  const { descriptor, errors } = parse(source, { filename: file });
  assert.deepEqual(errors, [], file);
  const bindings = descriptor.script || descriptor.scriptSetup ? compileScript(descriptor, { id: file }).bindings : {};
  if (descriptor.template) {
    const result = compileTemplate({ source: descriptor.template.content, filename: file, id: file, compilerOptions: { bindingMetadata: bindings } });
    assert.deepEqual(result.errors, [], file);
    for (const helper of ['translate', 'localizeText', 'commentLocale', 'formatNumber', 'formatLocalizedDate']) {
      if (new RegExp(helper === 'commentLocale' ? ':lang="commentLocale"' : `\\b${helper}\\s*\\(`).test(descriptor.template.content)) assert.ok(bindings[helper], `${file}: missing ${helper}`);
    }
  }
  for (const match of source.matchAll(/\b(?:translate|t|localeMessage)\(['"]([^'"]+)['"]/g)) assert.ok(catalogs['zh-CN'].has(match[1]), `${file}: unknown key ${match[1]}`);
  components++;
}

assert.equal(normalizeLocale('zh-TW'), 'zh-CN');
assert.equal(normalizeLocale(' en_GB '), 'en');
assert.equal(normalizeLocale('si-LK'), 'si');
for (const value of ['fr', '', '__proto__', 'constructor', null, {}]) assert.equal(normalizeLocale(value), null);
assert.equal(detectLocale(['fr-FR', 'si-LK', 'en-US']), 'si');
assert.equal(detectLocale(['de']), 'zh-CN');
const storage = { value: '{"SET_THEME":"forest","SET_LOCALE":"en"}', getItem() { return this.value; }, setItem(key, value) { this.value = value; } };
assert.equal(readLocalePreference(storage), 'en');
writeLocalePreference(storage, 'si');
assert.deepEqual(JSON.parse(storage.value), { SET_THEME: 'forest', SET_LOCALE: 'si' });
storage.value = 'bad JSON';
assert.equal(readLocalePreference(storage), null);
const disabledStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
assert.equal(readLocalePreference(disabledStorage), null);
assert.doesNotThrow(() => writeLocalePreference(disabledStorage, 'en'));

let current = 'zh-CN';
const saved = [];
const loads = new Map();
const switchLocale = createLocaleSwitcher({
  load: code => new Promise((resolve, reject) => loads.set(code, { resolve, reject })),
  apply: code => { current = code; }, persist: code => saved.push(code),
});
const first = switchLocale('en');
const second = switchLocale('si');
loads.get('si').resolve();
assert.equal(await second, true);
loads.get('en').resolve();
assert.equal(await first, false);
assert.equal(current, 'si');
assert.deepEqual(saved, ['si']);
const failure = switchLocale('en');
loads.get('en').reject(Error('network'));
await assert.rejects(failure, /network/);
assert.equal(current, 'si');
assert.deepEqual(saved, ['si']);
const retry = switchLocale('en', { save: false });
loads.get('en').resolve();
assert.equal(await retry, true);
assert.equal(current, 'en');
assert.deepEqual(saved, ['si']);
assert.equal(await switchLocale('fr'), false);
const workerMessage = describeImageMessage('正在处理 2/10 帧');
assert.deepEqual(workerMessage, { key: 'common.additional.processingFrame', params: { p0: '2', p1: '10' } });
assert.equal(describeImageMessage('Unrecognized native error'), null);
const md = new MarkdownIt().use(alertPlugin, { translateTitle: title => title === '提示' ? 'Tip' : title });
const decodeAlert = text => JSON.parse(decodeURIComponent(md.render(text).match(/data-markdown-props="([^"]+)"/)[1]));
assert.equal(decodeAlert('> [!TIP]\n> 正文').titleHtml, 'Tip');
assert.equal(decodeAlert('> [!TIP] 提示\n> 正文').titleHtml, '提示');
console.log(`i18n: ${keys.length} messages × 3 languages; ${components} Vue components; locale, storage, and loading checks passed.`);
await import('./check-i18n-runtime.mjs');
