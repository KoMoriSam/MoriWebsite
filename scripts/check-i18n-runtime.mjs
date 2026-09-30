import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { parse, compileScript } from 'vue/compiler-sfc';
import { createServer } from 'vite';
import vuePlugin from '@vitejs/plugin-vue';
import { createSSRApp, createRenderer, effectScope, h, nextTick, ref } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createPinia } from 'pinia';
import { advanceRoomTime, applyRoomAction, createPlayer, createRoom, roomView } from './games/state.js';
const cardRuntimeId = '\0virtual:avalon-cards';
const cardTestPlugin = {
  name: 'card-interaction-test',
  resolveId: id => id === 'virtual:avalon-cards' ? cardRuntimeId : undefined,
  load(id) {
    if (id !== cardRuntimeId) return;
    const { descriptor } = parse(readFileSync(path.resolve('src/components/games/avalon/interaction/BallotCards.vue'), 'utf8'));
    return compileScript(descriptor, { id: 'card-interaction-test', inlineTemplate: true }).content
      .replace(/^import RoleInfo from .*;$/m, 'const RoleInfo = { render: () => null };');
  },
};
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.cache/i18n-runtime', plugins: [cardTestPlugin, vuePlugin()], optimizeDeps: { noDiscovery: true, include: [] }, resolve: { alias: { '@': path.resolve('src') } }, server: { middlewareMode: true, watch: null }, appType: 'custom' });
try {
  const { createLocaleService, useLocale } = await server.ssrLoadModule('/src/i18n/index.js');
  const a = createLocaleService();
  const b = createLocaleService();
  assert.equal(a.locale.value, 'zh-CN');
  assert.deepEqual(a.i18n.global.availableLocales, ['zh-CN']);
  await a.switchLocale('en', { save: false });
  assert.equal(b.locale.value, 'zh-CN');
  assert.equal(a.text('正在处理 2/10 帧'), 'Processing frame 2/10');
  assert.equal(a.text('作者写的标题'), '作者写的标题');
  assert.equal(a.text('搜索'), 'Search');
  const renderer = createRenderer({
    createElement: () => ({ children: [], text: '' }),
    createText: text => ({ text }), createComment: () => ({}),
    setElementText: (node, text) => { node.text = text; },
    setText: (node, text) => { node.text = text; },
    insert: (node, parent) => { parent.children.push(node); },
    remove: () => {}, patchProp: () => {}, parentNode: () => null, nextSibling: () => null,
  });
  const input = ref('preserved tool input');
  const probe = { setup() {
    const service = useLocale();
    return () => h('p', service.text('搜索') + ':' + input.value);
  } };
  const root = { children: [] }, childRoot = { children: [] };
  const mainApp = renderer.createApp(probe), auxiliaryApp = renderer.createApp(probe);
  a.install(mainApp); a.provide(auxiliaryApp);
  mainApp.mount(root); auxiliaryApp.mount(childRoot);
  auxiliaryApp.unmount();
  await a.switchLocale('si', { save: false });
  await nextTick();
  assert.equal(root.children[0].text, a.text('搜索') + ':preserved tool input');
  assert.equal(input.value, 'preserved tool input');
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: { getItem: () => '{"SET_LOCALE":"si-LK"}' } } });
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { languages: ['en-US'] } });
    const info = ref({ SET_THEME: 'forest', SET_LOCALE: 'si-LK' });
    await b.restoreLocale(info);
    assert.equal(b.locale.value, 'si');
    await b.switchLocale('en');
    assert.deepEqual(info.value, { SET_THEME: 'forest', SET_LOCALE: 'en' });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { get localStorage() { throw Error('blocked'); } } });
    await b.restoreLocale();
    assert.equal(b.locale.value, 'en');
    await b.switchLocale('si');
    assert.equal(b.locale.value, 'si');
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else delete globalThis.window;
    if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator);
    else delete globalThis.navigator;
  }
  const router = createRouter({ history: createMemoryHistory(), routes: ['home','blog','novel','tools','test','image-converter','server-status','sinhala-font-converter','changelog','licenses','games','avalon'].map(name => ({ path: name === 'home' ? '/' : '/'+name, name, component: { render: () => null } })) });
  await router.push('/');
  await router.isReady();
  const tablePlayers = Array.from({ length: 5 }, (_, index) => ({ ...createPlayer('Seat ' + index, 'private-' + index), ready: true, online: true }));
  let tableRoom = createRoom('ABCDEFGH', 'avalon', tablePlayers[0]); tableRoom.players = tablePlayers;
  const lobbyTable = roomView(tableRoom, tableRoom.hostId);
  tableRoom = applyRoomAction(tableRoom, tableRoom.hostId, { id: crypto.randomUUID(), stage: tableRoom.stage, type: 'start' }).room;
  const nightTable = roomView(tableRoom, tableRoom.hostId);
  const tableAction = (playerId, type) => {
    tableRoom = applyRoomAction(tableRoom, playerId, { id: crypto.randomUUID(), stage: tableRoom.stage, type }).room;
  };
  tableAction(tableRoom.hostId, 'peek_role');
  const revealedTable = roomView(tableRoom, tableRoom.hostId);
  tableAction(tableRoom.hostId, 'confirm_role');
  const waitingTable = roomView(tableRoom, tableRoom.hostId);
  for (const player of tablePlayers.slice(1)) {
    tableAction(player.id, 'peek_role'); tableAction(player.id, 'confirm_role');
  }
  const discussionTable = roomView(tableRoom, tableRoom.hostId);
  const talkRoom = applyRoomAction(tableRoom, tableRoom.hostId, { id: crypto.randomUUID(), stage: tableRoom.stage, type: 'say', phraseId: 'claim', role: 'merlin' }).room;
  const talkView = roomView(talkRoom, talkRoom.hostId);
  const discussionMessages = { ...talkView, ...talkView.game, game: talkView.round };
  const percivalPlayer = tableRoom.players.find(p => tableRoom.gameState.roles[p.id] === 'percival');
  const percivalTable = roomView(tableRoom, percivalPlayer.id);
  tableRoom = advanceRoomTime(tableRoom, tableRoom.gameState.discussion.endsAt).room;
  const activeTable = roomView(tableRoom, tableRoom.hostId);
  const teamLeaderTable = roomView(tableRoom, tableRoom.gameState.participants[tableRoom.gameState.leaderIndex].id);
  const invitationTable = { ...activeTable, selfId: activeTable.game.leaderId, game: { ...activeTable.game, phase: 'discussion', discussion: { mode: 'fast', startedAt: Date.now(), endsAt: Date.now() + 15000, partnerId: null } } };
  const assassinationTable = { ...activeTable, game: { ...activeTable.game, phase: 'assassinate', self: { ...activeTable.game.self, role: 'assassin', knownEvil: [tablePlayers[1].id] } } };
  let historyRoom = tableRoom;
  const historyAction = (playerId, type, payload = {}) => {
    historyRoom = applyRoomAction(historyRoom, playerId, { id: crypto.randomUUID(), stage: historyRoom.stage, type, ...payload }).room;
  };
  historyAction(historyRoom.gameState.participants[historyRoom.gameState.leaderIndex].id, 'team', { team: tablePlayers.slice(0, 2).map(player => player.id) });
  for (const player of tablePlayers.filter(player => !Object.hasOwn(historyRoom.gameState.ballots, player.id))) historyAction(player.id, 'vote', { approve: true });
  for (const player of tablePlayers.slice(0, 2)) historyAction(player.id, 'quest', { success: true });
  const nextLeader = historyRoom.gameState.participants[historyRoom.gameState.leaderIndex].id;
  while (historyRoom.gameState.phase === 'discussion') historyRoom = advanceRoomTime(historyRoom, historyRoom.gameState.discussion.endsAt).room;
  historyAction(nextLeader, 'team', { team: tablePlayers.slice(0, 3).map(player => player.id) });
  for (const player of tablePlayers.filter(player => !Object.hasOwn(historyRoom.gameState.ballots, player.id))) historyAction(player.id, 'vote', { approve: false });
  const historyView = roomView(historyRoom, historyRoom.hostId);
  const questHistoryView = { ...historyView, ...historyView.game, game: historyView.round };
  const legacyHistoryView = { ...questHistoryView, history: questHistoryView.history.filter(entry => ['vote', 'quest'].includes(entry.type)).map(({ at, ...entry }) => entry) };
  tableRoom = applyRoomAction(tableRoom, tableRoom.hostId, { id: crypto.randomUUID(), stage: tableRoom.stage, type: 'end' }).room;
  const finishedTable = roomView(tableRoom, tableRoom.hostId);
  const identityProps = { selfId: revealedTable.selfId, playerName: id => tablePlayers.find(player => player.id === id)?.nickname ?? id, faceUp: true, backTitle: '', backHint: '' };
  const cases = [
    ['/src/components/games/avalon/display/DiscussionTimer.vue', { discussion: { mode: 'slow', startedAt: 0, endsAt: 150000, partnerId: null }, serverNow: 105000 }, 'Open discussion · 00:45', 'විවෘත සාකච්ඡාව · 00:45'],
    ['/src/components/games/avalon/display/DiscussionTimer.vue', { discussion: { mode: 'fast', startedAt: 0, endsAt: 15000, partnerId: null }, serverNow: 0 }, 'Choose partner · 00:15', 'සහකරු තේරීම · 00:15'],
    ['/src/components/games/avalon/display/DiscussionTimer.vue', { discussion: { mode: 'fast', startedAt: 0, endsAt: 60000, partnerId: 'partner' }, serverNow: 0 }, 'Pair dialogue · 01:00', 'දෙදෙනාගේ සංවාදය · 01:00'],
    ['/src/components/games/avalon/display/QuestHistory.vue', { room: questHistoryView, quest: 0 }, 'Execute 2 · Sabotage 0', 'ක්‍රියාත්මක 2 · බාධා 0'],
    ['/src/components/games/avalon/display/QuestHistory.vue', { room: questHistoryView, quest: 1 }, 'Team of 3', 'කණ්ඩායමේ 3 දෙනෙක්'],
    ['/src/components/games/avalon/display/QuestHistory.vue', { room: legacyHistoryView, quest: 0 }, 'Execute 2 · Sabotage 0', 'ක්‍රියාත්මක 2 · බාධා 0'],
    ['/src/components/games/avalon/layout/RoundTable.vue', { room: historyView, canAct: true, run: () => {} }, 'Public game record', 'පොදු ක්‍රීඩා වාර්තාව'],
    ['/src/components/games/avalon/display/IdentityCard.vue', { ...identityProps, self: { role: 'merlin', knownEvil: ['known-evil'] } }, 'known-evil', 'known-evil'],
    ['/src/components/games/avalon/display/IdentityCard.vue', { ...identityProps, self: { role: 'morgana', knownEvil: ['known-ally'] } }, 'known-ally', 'known-ally'],
    ['/src/components/games/avalon/interaction/Discussion.vue', { room: discussionMessages, canAct: true, run: () => {} }, 'I claim to be Merlin.', 'මගේ චරිතය මර්ලින් බව මම ප්‍රකාශ කරනවා.'],
    ['/src/components/games/avalon/interaction/BallotCards.vue', { active: true, canSubmit: true, submitted: false, context: 'room:1:2' }, 'Your ballot cards', 'ඔබේ ඡන්ද කාඩ්පත්'],
    ['/src/components/games/avalon/interaction/BallotCards.vue', { active: true, canSubmit: false, submitted: true, context: 'room:1:2' }, 'Submitted', 'යවා ඇත'],
    ['/src/components/games/avalon/interaction/BallotCards.vue', { active: true, canSubmit: false, submitted: true, autoApproved: true, context: 'room:1:2' }, 'Approved automatically; waiting for others', 'ස්වයංක්‍රීයව අනුමතයි; අනෙක් අය බලා සිටී'],
    ['/src/components/games/avalon/interaction/BallotCards.vue', { mode: 'quest', active: true, canSubmit: true, allowFail: true, context: 'room:1:3' }, 'Sabotage', 'බාධා කරන්න'],
    ['/src/components/games/avalon/interaction/BallotCards.vue', { mode: 'quest', active: true, canSubmit: true, allowFail: false, context: 'room:1:3' }, 'Execute', 'ක්‍රියාත්මක කරන්න'],
    ['/src/views/Games.vue', {}, 'Available board games', 'ලබාගත හැකි පුවරු ක්‍රීඩා'],
    ['/src/views/games/Avalon.vue', {}, 'Create room', 'කාමරයක් සාදන්න'],
    ['/src/components/games/avalon/interaction/Settings.vue', { room: lobbyTable, canAct: true, run: () => {} }, 'Roles for this game', 'මෙම ක්‍රීඩාවේ චරිත'],
    ['/src/components/games/avalon/interaction/Settings.vue', { room: { ...lobbyTable, selfId: tablePlayers[1].id }, canAct: true, run: () => {} }, '5-player preview', 'ක්‍රීඩකයන් 5 සඳහා පෙරදසුන'],
    ['/src/components/games/avalon/interaction/Settings.vue', { room: { ...lobbyTable, gameConfig: { specialRoles: ['morgana', 'mordred', 'oberon'] } }, canAct: true, run: () => {} }, 'Too many special roles', 'විශේෂ චරිත වැඩියි'],
    ['/src/components/games/avalon/layout/RoundTable.vue', { room: percivalTable, canAct: true, run: () => {} }, 'Round table discussion', 'වට මේස සාකච්ඡාව'],
    ['/src/components/games/avalon/layout/RoundTable.vue', { room: nightTable, canAct: true, run: () => {} }, 'An unrevealed identity card', 'තවමත් විවෘත නොකළ අනන්‍යතා කාඩ්පතක්'],
    ['/src/components/games/avalon/layout/RoundTable.vue', { room: revealedTable, canAct: true, run: () => {} }, 'Remembered.', 'මතක තබාගත්තා'],
    ['/src/components/games/avalon/layout/RoundTable.vue', { room: waitingTable, canAct: true, run: () => {} }, 'Your identity card is face down', 'ඔබේ අනන්‍යතා කාඩ්පත වසා ඇත'],
    ['/src/components/games/avalon/layout/RoundTable.vue', { room: discussionTable, canAct: true, run: () => {} }, 'Round table discussion', 'වට මේස සාකච්ඡාව'],
    ['/src/components/games/avalon/layout/RoundTable.vue', { room: teamLeaderTable, canAct: true, run: () => {} }, 'Build a team', 'කණ්ඩායම සාදන්න'],
    ['/src/components/games/avalon/layout/RoundTable.vue', { room: invitationTable, canAct: true, run: () => {} }, 'Round table discussion', 'වට මේස සාකච්ඡාව'],
    ['/src/components/games/avalon/layout/RoundTable.vue', { room: assassinationTable, canAct: true, run: () => {} }, 'Find Merlin', 'මර්ලින් සොයන්න'],
    ['/src/components/games/avalon/layout/RoundTable.vue', { room: finishedTable, canAct: true, run: () => {} }, 'Game ended without a winner', 'ජයග්‍රාහකයෙකු නොමැතිව ක්‍රීඩාව අවසන් විය'],
    ['/src/views/Tools.vue', {}, 'Image converter', 'රූප පරිවර්තකය'],
    ['/src/components/layout/NavLinks.vue', {}, 'Home', 'මුල් පිටුව'],
    ['/src/components/interaction/overlay/Modal.vue', { visible: true }, 'Close', 'වසන්න'],
    ['/src/components/interaction/navigation/Pagination.vue', { currentPage: 1, totalPages: 3 }, 'Next page', 'ඊළඟ පිටුව'],
    ['/src/components/tools/sinhala/Info.vue', {}, 'About Sinhala', 'සිංහල පැරණි'],
    ['/src/views/tools/SinhalaFontConverter.vue', {}, 'Unicode text', 'Unicode පෙළ'],
    ['/src/views/tools/ImageConverter.vue', {}, 'Image converter', 'රූප පරිවර්තකය'],
  ];
  for (const [file, props, en, si] of cases) {
    const { default: component } = await server.ssrLoadModule(file);
    const renderProps = file.endsWith('/RoundTable.vue')
      ? { playersTargetId: 'i18n-test-players', ...props }
      : file.endsWith('/BallotCards.vue')
        ? { self: revealedTable.game.self, selfId: revealedTable.selfId, playerName: identityProps.playerName, ...props }
        : props;
    for (const [code, expected] of [['en', en], ['si', si]]) {
      const app = createSSRApp({ render: () => h(component, renderProps) });
      app.use(createPinia()); app.use(router); a.install(app);
      await a.switchLocale(code, { save: false });
      const html = await renderToString(app);
      assert.ok(html.includes(expected), `${file}: ${code} render missing ${expected}`);
      if (file.endsWith('/RoundTable.vue') && props.room === teamLeaderTable) assert.equal((html.match(/type="checkbox" class="checkbox checkbox-sm/g) ?? []).length, 5, 'Team selection uses player checkboxes');
      if (file.endsWith('/RoundTable.vue') && props.room === invitationTable) assert.equal((html.match(/type="radio"/g) ?? []).length, 4, 'Invitation uses one radio per other player');
      if (file.endsWith('/RoundTable.vue') && props.room === assassinationTable) assert.equal((html.match(/type="radio"/g) ?? []).length, 3, 'Assassination excludes self and known allies');
      if (file.endsWith('/BallotCards.vue') && props.mode === 'quest' && !props.allowFail) assert.ok(!html.includes(code === 'en' ? 'Sabotage' : 'බාධා කරන්න'), 'Good players cannot choose Sabotage');
      if (file.endsWith('/BallotCards.vue') && props.autoApproved) {
        assert.ok(!html.includes(a.t('avalon.reject')), 'Leader approval has no reject card');
        assert.ok(html.includes('aria-pressed="true"'), 'Leader approval card is selected');
      }
      if (file.endsWith('/IdentityCard.vue')) {
        assert.ok(html.includes(props.self.role === 'merlin' ? 'bg-success/10' : 'bg-error/10'), 'Identity face uses faction color');
        assert.ok(!html.includes(a.t('avalon.roleDetails')), 'Night card shows details directly');
        assert.ok(html.includes(a.t(`avalon.roleHints.${props.self.role}`)), 'Night role ability is present');
      }
      if (file.endsWith('/QuestHistory.vue')) {
        if (props.quest === 0) {
          assert.ok(html.indexOf(a.t('avalon.records.types.vote')) < html.indexOf(a.t('avalon.records.types.quest')), 'Vote precedes quest result');
          assert.ok(!html.includes(a.t('avalon.rejectedLabel')), 'Another quest rejection stays in its own group');
        } else {
          assert.ok(html.includes(a.t('avalon.rejectedLabel')));
          assert.ok(!html.includes(a.t('avalon.records.types.quest')), 'Unfinished quest has no fabricated result');
        }
      }
      if (file.endsWith('/RoundTable.vue') && props.room === historyView) assert.equal((html.match(/id="quest-detail-[^"]+" role="tooltip"/g) ?? []).length, 5, 'Every quest has details');
    }
  }
  // Exercise the shared card interactions without starting a browser.
  const makeNode = tag => ({ tag, children: [], props: {}, parent: null, captured: null,
    getBoundingClientRect: () => ({ left: 0, right: 200, top: 200, bottom: 260 }),
    setPointerCapture(id) { this.captured = id; }, hasPointerCapture(id) { return this.captured === id; }, releasePointerCapture() { this.captured = null; },
  });
  const cardRenderer = createRenderer({
    createElement: makeNode, createText: text => ({ text, children: [] }), createComment: () => ({ children: [] }),
    setElementText: (node, text) => { node.text = text; node.children = []; }, setText: (node, text) => { node.text = text; },
    insert: (node, parent, anchor) => {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1);
      node.parent = parent; const index = anchor ? parent.children.indexOf(anchor) : -1;
      index < 0 ? parent.children.push(node) : parent.children.splice(index, 0, node);
    },
    remove: node => { if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1); },
    patchProp: (node, key, before, after) => { node.props[key] = after; },
    parentNode: node => node.parent, nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
  });
  const { default: ChoiceCards } = await server.ssrLoadModule('virtual:avalon-cards');
  const cardProps = ref({ self: revealedTable.game.self, selfId: revealedTable.selfId, playerName: identityProps.playerName, active: true, canSubmit: true, mode: 'vote', allowFail: true, submitted: false, context: 'room:1:1' });
  const submittedCards = [];
  const cardRoot = makeNode('root');
  const cardApp = cardRenderer.createApp({ render: () => h(ChoiceCards, { ...cardProps.value, onVote: value => submittedCards.push(['vote', value]), onQuest: value => submittedCards.push(['quest', value]) }) });
  a.provide(cardApp); cardApp.mount(cardRoot);
  const walk = node => [node, ...node.children.flatMap(walk)];
  const cards = () => walk(cardRoot).filter(node => node.tag === 'button' && node.props.class.includes('card card-border'));
  const drop = () => walk(cardRoot).find(node => node.tag === 'button' && node.props.class.includes('border-dashed'));
  const pointer = (button, x, y) => ({ currentTarget: button, pointerId: 1, isPrimary: true, button: 0, clientX: x, clientY: y, preventDefault() {} });
  try {
    cards()[0].props.onClick(); assert.deepEqual(submittedCards, []);
    drop().props.onClick(); assert.deepEqual(submittedCards, [['vote', true]]);
    cardProps.value = { ...cardProps.value, mode: 'quest', context: 'room:1:2' }; await nextTick();
    const sabotage = cards()[1];
    sabotage.props.onPointerdown(pointer(sabotage, 10, 10));
    sabotage.props.onPointermove(pointer(sabotage, 40, 220));
    sabotage.props.onPointerup(pointer(sabotage, 40, 220));
    assert.deepEqual(submittedCards.at(-1), ['quest', false]); assert.equal(sabotage.captured, null);
    const count = submittedCards.length;
    sabotage.props.onPointerdown(pointer(sabotage, 10, 10));
    cardProps.value = { ...cardProps.value, context: 'room:1:3' }; await nextTick();
    sabotage.props.onPointerup(pointer(sabotage, 40, 220));
    drop().props.onClick(); assert.equal(submittedCards.length, count); assert.equal(sabotage.captured, null);
    cardProps.value = { ...cardProps.value, allowFail: false }; await nextTick();
    assert.equal(cards().length, 1);
    sabotage.props.onClick(); drop().props.onClick(); assert.equal(submittedCards.length, count);
    cards()[0].props.onClick(); drop().props.onClick(); assert.deepEqual(submittedCards.at(-1), ['quest', true]);
    cardProps.value = { ...cardProps.value, submitted: true }; await nextTick();
    cards()[0].props.onClick(); assert.equal(submittedCards.length, count + 1);
  } finally { cardApp.unmount(); }
  // Local notes survive a refresh, never cross seats/rounds, and clear on finish.
  const { useAvalonNotes } = await server.ssrLoadModule('/src/composables/games/avalon/useAvalonNotes.js');
  const noteStorage = new Map();
  const noteWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const noteScope = effectScope(); const restoredScope = effectScope();
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
      getItem: key => noteStorage.get(key) ?? null,
      setItem: (key, value) => noteStorage.set(key, value),
      removeItem: key => noteStorage.delete(key),
    } } });
    const noteRoom = ref({ code: 'ABCDEFGH', selfId: 'self', game: 1, phase: 'discussion', players: [{ id: 'self' }, { id: 'other' }] });
    const notes = noteScope.run(() => useAvalonNotes(noteRoom));
    notes.markPlayer('other', 'merlin');
    assert.deepEqual(notes.marks.value, { other: 'merlin' });
    notes.markPlayer('self', 'evil'); notes.markPlayer('missing', 'evil'); notes.markPlayer('other', 'invalid');
    assert.deepEqual(notes.marks.value, { other: 'merlin' });
    const restored = restoredScope.run(() => useAvalonNotes(noteRoom));
    assert.deepEqual(restored.marks.value, { other: 'merlin' });
    noteRoom.value = { ...noteRoom.value, selfId: 'other' };
    assert.deepEqual(notes.marks.value, {});
    noteRoom.value = { ...noteRoom.value, selfId: 'self' };
    assert.deepEqual(notes.marks.value, { other: 'merlin' });
    noteRoom.value = { ...noteRoom.value, game: 2, phase: 'night' };
    assert.deepEqual(notes.marks.value, {}); assert.equal(noteStorage.size, 0);
    notes.markPlayer('other', 'candidate'); assert.deepEqual(notes.marks.value, {});
    notes.markPlayer('other', 'merlin'); notes.markPlayer('other', '');
    assert.deepEqual(notes.marks.value, {}); assert.equal(noteStorage.size, 0);
    notes.markPlayer('other', 'evil');
    noteRoom.value = { ...noteRoom.value, phase: 'finished' };
    assert.deepEqual(notes.marks.value, {}); assert.equal(noteStorage.size, 0);
    notes.markPlayer('other', 'good'); assert.deepEqual(notes.marks.value, {});
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { get localStorage() { throw Error('denied'); } } });
    noteRoom.value = { ...noteRoom.value, game: 3, phase: 'discussion' };
    notes.markPlayer('other', 'good'); assert.deepEqual(notes.marks.value, { other: 'good' });
    noteRoom.value = { ...noteRoom.value, phase: 'finished' };
    assert.deepEqual(notes.marks.value, {});
  } finally {
    noteScope.stop(); restoredScope.stop();
    if (noteWindow) Object.defineProperty(globalThis, 'window', noteWindow);
    else delete globalThis.window;
  }
  mainApp.unmount();
  console.log(`i18n runtime: instance isolation, lazy loading, preferences, denied storage, auxiliary app disposal, preserved input, local notes isolation/restore/reset, card click/drag/mode/reset checks, and ${cases.length} bilingual renders passed.`);
} finally { await server.close(); }
