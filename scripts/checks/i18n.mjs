import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createI18n } from 'vue-i18n';
import MarkdownIt from 'markdown-it';
import { alertPlugin } from '../../src/utils/markdown/markdown-it-alert.js';
import { describeImageMessage } from '../../src/utils/image/messages.js';
import { LOCALES, getLocaleFallbacks, normalizeLocale, detectLocale, readLocalePreference, writeLocalePreference, createLocaleSwitcher } from '../../src/i18n/locale.js';

const require = createRequire(import.meta.url);
const { parse, compileScript, compileTemplate } = require('vue/compiler-sfc');
const codes = LOCALES.map(({ code }) => code);
const flatten = (tree, prefix = '') => Object.entries(tree).flatMap(([key, value]) => typeof value === 'string' ? [[prefix + key, value]] : flatten(value, prefix + key + '.'));
const groups = fs.readdirSync('src/i18n/messages/zh-CN').filter(file => file.endsWith('.json')).sort();
const messages = Object.fromEntries(codes.map(code => {
  assert.deepEqual(fs.readdirSync(`src/i18n/messages/${code}`).sort(), groups, `${code}: message groups`);
  const tree = {};
  const seen = new Set();
  for (const group of groups) {
    const file = `src/i18n/messages/${code}/${group}`;
    const entries = flatten(JSON.parse(fs.readFileSync(file, 'utf8')));
    const sourceKeys = flatten(JSON.parse(fs.readFileSync(`src/i18n/messages/zh-CN/${group}`, 'utf8'))).map(([key]) => key).sort();
    assert.deepEqual(entries.map(([key]) => key).sort(), sourceKeys, `${file}: message keys`);
    for (const [key, value] of entries) {
      assert.ok(!seen.has(key), `${file}: duplicate key ${key}`);
      seen.add(key);
      const parts = key.split('.');
      const leaf = parts.pop();
      let node = tree;
      for (const part of parts) node = node[part] ||= {};
      node[leaf] = value;
    }
  }
  return [code, tree];
}));
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
const sinhala = createI18n({ legacy: false, locale: 'si', messages });
try {
  const t = sinhala.global.t;
  const names = messages.si.blog.article.languages;
  for (const requestedLanguage of Object.values(names)) {
    for (const currentLanguage of Object.values(names)) {
      const notice = t('blog.article.fallbackNotice', { requestedLanguage, currentLanguage });
      assert.ok(!/භාෂාව භාෂාවෙන්|භාෂාව අනුවාදය/.test(notice), 'Do not insert a standalone language noun into an adjective slot');
    }
  }
  for (const choice of [t('avalon.approve'), t('avalon.reject')]) {
    assert.ok(t('avalon.ballot.confirm', { choice }).includes(`“${choice}”`), 'Predicate vote labels must be quoted rather than used as noun modifiers');
  }
  for (const side of [t('avalon.night.good'), t('avalon.night.evil')]) {
    const changed = t('avalon.lancelot.changed', { side });
    assert.ok(changed.includes(`වත්මන් පාර්ශ්වය: ${side}`), 'Name the player’s allegiance without saying the player is a faction');
    assert.ok(!changed.includes(`ඔබ දැන් ${side} වේ`));
  }
  // Role and player names can have different endings; never manufacture their
  // case forms by attaching a fixed Sinhala suffix to the interpolated value.
  for (const [key, message] of catalogs.si) {
    assert.ok(!/\{(?:name|target|partner|leader|role|side|choice)\}\s*(?:ගේ|යි(?=[\s.,!?]|$)|වේ(?=[\s.,!?]|$))/u.test(message), `${key}: inflect a contextual noun, not an arbitrary label`);
  }
  for (const role of Object.values(messages.si.avalon.roles)) {
    const vision = t('avalon.night.roleVision', { name: 'Mori', role });
    assert.ok(vision.includes(`චරිතය: ${role}`), 'Role names of different forms remain complete');
  }
} finally { sinhala.dispose(); }
if (process.argv.includes('--messages-only')) {
  console.log(`文案检查通过：${codes.length} 种语言、${groups.length} 组词库、${keys.length} 条文案。`);
  process.exit(0);
}

let components = 0;
const checkReferences = (source, file) => {
  for (const match of source.matchAll(/\b(?:translate|t|localeMessage)\(\s*(['"])([\w.-]+)\1/g)) {
    const key = match[2];
    assert.ok(key.endsWith('.') ? keys.some(candidate => candidate.startsWith(key)) : catalogs['zh-CN'].has(key), `${file}: unknown key ${key}`);
  }
  for (const match of source.matchAll(/(?<![:@\w-])(?:keypath|message-key|title-key|term-key|description-key|note-key|footer-note-key)=['"]([\w.-]+)['"]/g)) {
    assert.ok(catalogs['zh-CN'].has(match[1]), `${file}: unknown message attribute ${match[1]}`);
  }
  for (const match of source.matchAll(/\b(?:key|messageKey|titleKey|termKey|descriptionKey|noteKey|footerNoteKey)['"]?\s*:\s*['"]([\w-]+\.[\w.-]+)['"]/g)) {
    assert.ok(catalogs['zh-CN'].has(match[1]), `${file}: unknown message key ${match[1]}`);
  }
};
for (const file of fs.readdirSync('src', { recursive: true }).filter(file => file.endsWith('.js'))) {
  checkReferences(fs.readFileSync('src/' + file, 'utf8'), file);
}
for (const file of fs.readdirSync('src', { recursive: true }).filter(file => file.endsWith('.vue') && !/^views[\\/]test[\\/]|^views[\\/]Test.vue/.test(file))) {
  const source = fs.readFileSync('src/' + file, 'utf8');
  const { descriptor, errors } = parse(source, { filename: file });
  assert.deepEqual(errors, [], file);
  const bindings = descriptor.script || descriptor.scriptSetup ? compileScript(descriptor, { id: file }).bindings : {};
  if (descriptor.template) {
    const result = compileTemplate({ source: descriptor.template.content, filename: file, id: file, compilerOptions: { bindingMetadata: bindings } });
    assert.deepEqual(result.errors, [], file);
    for (const helper of ['translate', 'localizeText', 'commentLocale', 'formatNumber', 'formatLocalizedDate']) {
      const pattern = helper === 'commentLocale' ? ':lang="commentLocale"' : helper === 'translate' ? `\\btranslate\\s*\\(\\s*['"]\\w` : `\\b${helper}\\s*\\(`;
      if (new RegExp(pattern).test(descriptor.template.content)) assert.ok(bindings[helper], `${file}: missing ${helper}`);
    }
  }
  checkReferences(source, file);
  components++;
}

assert.equal(normalizeLocale('zh-TW'), 'zh-CN');
assert.equal(normalizeLocale(' en_GB '), 'en');
assert.equal(normalizeLocale('si-LK'), 'si');
assert.equal(normalizeLocale('fr-CA'), 'fr');
assert.deepEqual(getLocaleFallbacks('fr-CA'), ['fr', 'en', 'zh-CN']);
assert.deepEqual(getLocaleFallbacks('si'), ['si', 'en', 'zh-CN']);
assert.deepEqual(getLocaleFallbacks('en'), ['en', 'zh-CN']);
assert.deepEqual(getLocaleFallbacks('zh-CN'), ['zh-CN']);
for (const value of ['', '__proto__', 'constructor', null, {}]) assert.equal(normalizeLocale(value), null);
assert.equal(detectLocale(['fr-FR', 'si-LK', 'en-US']), 'fr');
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
const french = switchLocale('fr');
loads.get('fr').resolve();
assert.equal(await french, true);
assert.equal(current, 'fr');
assert.deepEqual(saved, ['si', 'fr']);
assert.equal(await switchLocale('de'), false);
const workerMessage = describeImageMessage('正在处理 2/10 帧');
assert.deepEqual(workerMessage, { key: 'image.worker.processingFrame', params: { p0: '2', p1: '10' } });
assert.equal(describeImageMessage('Unrecognized native error'), null);
const md = new MarkdownIt().use(alertPlugin, { translateTitle: title => title === '提示' ? 'Tip' : title });
const decodeAlert = text => JSON.parse(decodeURIComponent(md.render(text).match(/data-markdown-props="([^"]+)"/)[1]));
assert.equal(decodeAlert('> [!TIP]\n> 正文').titleHtml, 'Tip');
assert.equal(decodeAlert('> [!TIP] 提示\n> 正文').titleHtml, '提示');
console.log(`界面检查通过：${codes.length} 种语言、${components} 个组件，语言设置与文案可正常使用。`);
if (!process.argv.includes('--static-only')) await import('./i18n-runtime.mjs');
