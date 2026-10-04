import assert from 'node:assert/strict';
import { reactive, ref, createRenderer } from 'vue';
import { useActionMode } from '../src/composables/games/fogport/useActionMode.js';
import { usePointerDrag } from '../src/composables/games/fogport/usePointerDrag.js';
import { legalActions,completeAction,extensions,resourceSteps,bonusChoices,unavailableReason,liquidationOptions } from '../shared/games/fogport/options.js';
import { MAP_POINTS,routeBranches,routeSegments,routeHitIds,displayedLinks,displayEra } from '../src/games/fogport/map-layout.js';
import { TILES, TILE_BY_ID, LINKS, LINK_BY_ID, CITIES, PLACES, INCOME, deckFor, merchantMix,MARKET_PRICES,BOARD_VERSION,linkKind } from '../shared/games/fogport/data.js';
import { createGame, applyGameAction, previewAction, publicView, actorId, network, distances, resourceOptions, normalizeConfig, abortGame,buildingTargets } from '../shared/games/fogport/engine.js';
import { createRoom, createPlayer, applyRoomAction, roomView } from './games/state.js';
let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const rng=seed=>n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
const people=n=>Array.from({length:n},(_,i)=>({id:String.fromCharCode(97+i),nickname:`P${i}`}));
const fresh=(n=2,mode='full')=>createGame(people(n),rng(19),{mode},0);
const fixture=()=>{const s=fresh();s.order=['a','b'];s.actionsLeft=2;s.eraRound=2;s.players[0].money=100;return s;};
const player=(s,id='a')=>s.players.find(p=>p.id===id);
const card=(s,kind='industry',value=['beer'])=>{const c={id:`test${player(s).hand.length}`,kind,...(kind==='location'?{location:value}:{industries:value})};player(s).hand.push(c);return c.id;};
const building=(s,type,level,location,owner='a',resources=0,flipped=false,slot=0)=>{const t={id:`b${s.nextBuilding++}`,tileId:TILES[type].find(t=>t.level===level).id,location,owner,resources,flipped,slot};s.buildings.push(t);return t;};
const links=(s,...ids)=>{s.links.push(...ids.map(id=>({id,owner:'a'})));};
const command=(s,kind,payload={})=>({type:`fogport_${kind}`,card:player(s).hand[0].id,...payload});
const apply=(s,kind,payload={})=>applyGameAction(s,'a',command(s,kind,payload),rng(31),10);
const rejects=(s,kind,payload,code,id='a')=>{const before=JSON.stringify(s);assert.throws(()=>applyGameAction(s,id,command(s,kind,payload),rng(31),10),e=>e.code===code);eq(JSON.stringify(s),before);checks++;};
// Small focused entry point for map changes; full-game suites remain opt-in.
if(process.argv.includes('--map')) {
 const {ANNOTATION_NODES,ANNOTATION_POINTS,MAP_ANNOTATION_SIZE,MAP_SIZE}=await import('../shared/games/fogport/board-data.js');
 eq(MAP_ANNOTATION_SIZE,1280);
 // Latest marked artwork, not inferred factory positions on an older background.
 for(const [label,centre] of Object.entries({d1:[707,91],d8:[872,473],d17:[800,889],d21:[331,1078],p1:[349,94],p5:[634,1185]})) {
  eq(ANNOTATION_POINTS[label],centre);
  const point=MAP_POINTS[ANNOTATION_NODES[label]];
  eq(point.every((n,i)=>Math.abs(n-centre[i]*MAP_SIZE/1280)<1e-10),true);
 }
 const pairs={
  both:['p1-d3','d3-d1','d3-d4','d2-d6','d6-p2','d4-d7','d4-d8','d7-d10','d8-d6','d9-d10','d10-d13','d10-d14','p3-d12','d12-d13','d13-d14','d13-d16','d12-d19','d16-d19','d16-d17','d14-d17','d8-d11','d11-d15','d11-d17','d17-d18','d17-d20','d17-p4','d17-d22','d19-d22','d20-p4','d20-p5','d22-p5'],
  railOnly:['d1-d2','d4-d5','d5-d6','d10-d8','d14-d11','d17-d15','d15-d18'],
  canalOnly:['d14-d8'],
 };
 for(const [scope,expected] of Object.entries(pairs)) eq(
  LINKS.filter(l=>l.scope===scope).map(l=>l.nodes.slice(0,2).sort().join('-')).sort(),
  expected.map(pair=>pair.split('-').map(id=>ANNOTATION_NODES[id]).sort().join('-')).sort());
 eq(CITIES.length,20);eq(CITIES.reduce((n,c)=>n+c.slots.length,0),47);eq(PLACES.length,27);
 for(const n of [2,3,4]) {eq(deckFor(n).length,[40,54,64][n-2]);eq(fresh(n).deck.length,[22,27,28][n-2]);}
 for(const p of PLACES) eq(MAP_POINTS[p.id],[p.x,p.y]);
 // Preview geometry is visible before its era, without becoming a route drop target.
 eq(displayedLinks(LINKS,'canal').length,39);eq(displayedLinks(LINKS,'rail').length,38);
 for(const link of LINKS.filter(l=>l.scope==='railOnly')) {
  eq(displayedLinks(LINKS,'canal').includes(link),true);eq(displayEra(link,'canal'),'rail');
  const path=routeBranches(link,displayEra(link,'canal'))[0],point=path[Math.floor(path.length/2)];
  eq(routeHitIds(LINKS,'canal',point).includes(link.id),false);
  eq(routeHitIds(LINKS,'rail',point).includes(link.id),true);
 }
 for(const era of ['canal','rail']) for(const l of LINKS) {
  eq(!!l[era],era==='canal'?l.scope!=='railOnly':l.scope!=='canalOnly');
  if(!l[era]) continue;
  eq(linkKind(l,era),era==='canal'?'canal':'railway');
  const branches=routeBranches(l,era);eq(branches.length,l.id==='l30'?2:1);
  eq([branches[0][0].x,branches[0][0].y],MAP_POINTS[l.nodes[0]]);
  eq([branches[0].at(-1).x,branches[0].at(-1).y],MAP_POINTS[l.nodes[1]]);
  if(l.id==='l30') eq([branches[1][0].x,branches[1][0].y],MAP_POINTS.f2);
  if(l.id==='l30') eq(branches[0].some(p=>Math.hypot(p.x-branches[1].at(-1).x,p.y-branches[1].at(-1).y)<1e-10),true);
  for(const branch of branches) eq(routeHitIds(LINKS,era,branch[Math.floor(branch.length/2)]).includes(l.id),true);
  eq(routeSegments(l,era).every(s=>s.length>0 && Number.isFinite(s.angle)),true);
 }
 const canal=fixture();rejects(canal,'network',{links:['l11']},'LINK');
 const rail=fixture();rail.era='rail';rejects(rail,'network',{links:['l3']},'LINK');
 const farm=apply(canal,'network',{links:['l30']});eq([...network(farm,'a')],['d9','d20','f2']);
 eq(distances(farm,['f2']),{f2:0,d9:1,d20:1});eq(farm.links.length,1);
 for(const era of ['canal','rail']) {const state=fixture();state.era=era;
  const built=apply(state,'network',{links:['l24'],...(era==='rail'?{resources:['market']}:{})});
  eq(player(built).money,era==='canal'?97:94);eq(publicView(JSON.parse(JSON.stringify(built)),'a').boardVersion,BOARD_VERSION);
 }
 console.log('Fogport map: '+checks+' focused assertions passed.');process.exit(0);
}
eq(Object.values(TILES).map(v=>v.length),[11,7,4,11,5,7]);
// Independent transcription of physical components; see PLAN.md's source audit.
// level / copies / cost / coal / iron / sale beer / VP / income / links / output / era / develop
const auditedIndustries = {
 cotton: [[1,3,12,0,0,1,5,5,1,0,'c',true],[2,2,14,1,0,1,5,4,2,0,'b',true],[3,3,16,1,1,1,9,3,1,0,'b',true],[4,3,18,1,1,1,12,2,1,0,'b',true]],
 coal: [[1,1,5,0,0,0,1,4,2,2,'c',true],[2,2,7,0,0,0,2,7,1,3,'b',true],[3,2,8,0,1,0,3,6,1,4,'b',true],[4,2,10,0,1,0,4,5,1,5,'b',true]],
 iron: [[1,1,5,1,0,0,3,3,1,4,'c',true],[2,1,7,1,0,0,5,3,1,4,'b',true],[3,1,9,1,0,0,7,2,1,5,'b',true],[4,1,12,1,0,0,9,1,1,6,'b',true]],
 goods: [[1,1,8,1,0,1,3,5,2,0,'c',true],[2,2,10,0,1,1,5,1,1,0,'b',true],[3,1,12,2,0,0,4,4,0,0,'b',true],[4,1,8,0,1,1,3,6,1,0,'b',true],[5,2,16,1,0,2,8,2,2,0,'b',true],[6,1,20,0,0,1,7,6,1,0,'b',true],[7,1,16,1,1,0,9,4,0,0,'b',true],[8,2,20,0,2,1,11,1,1,0,'b',true]],
 pottery: [[1,1,17,0,1,1,10,5,1,0,'b',false],[2,1,0,1,0,1,1,1,1,0,'b',true],[3,1,22,2,0,2,11,5,1,0,'b',false],[4,1,0,1,0,1,1,1,1,0,'b',true],[5,1,24,2,0,2,20,5,1,0,'r',true]],
 beer: [[1,2,5,0,1,0,4,4,2,1,'c',true],[2,2,7,0,1,0,5,5,2,1,'b',true],[3,2,9,0,1,0,7,5,2,1,'b',true],[4,1,9,0,1,0,10,5,2,2,'r',true]],
};
for (const [type, levels] of Object.entries(auditedIndustries)) {
 const expectedIds = [];
 for (const [level,copies,cost,coal,iron,beer,vp,income,link,output,era,develop] of levels) {
  const tiles = TILES[type].filter(tile=>tile.level===level);
  eq(tiles.map(({cost,coal,iron,beer,vp,income,link,output,canal,rail,develop})=>[cost,coal,iron,beer,vp,income,link,output,canal,rail,develop]),
   Array.from({length:copies},()=>[cost,coal,iron,beer,vp,income,link,output,era!=='r',era!=='c',develop]));
  const ids = Array.from({length:copies},(_,copy)=>`${type}-${level}-${copy}`);
  eq(tiles.map(tile=>tile.id),ids);expectedIds.push(...ids);
 }
 eq(TILES[type].map(tile=>tile.id),expectedIds);
}
eq(Object.keys(TILE_BY_ID).length,45);eq(LINKS.length,39);eq(CITIES.length,20);
eq(CITIES.reduce((sum,c)=>sum+c.slots.length,0),47);eq(LINKS.filter(l=>l.canal).length,32);eq(LINKS.filter(l=>l.rail).length,38);
eq(MARKET_PRICES.coal,[1,1,2,2,3,3,4,4,5,5,6,6,7,7]);eq(MARKET_PRICES.iron,[1,1,2,2,3,3,4,4,5,5]);
for(const tile of Object.values(TILE_BY_ID)) {
 eq(['cost','coal','iron','beer','vp','income','link','output'].every(key=>Number.isInteger(tile[key]) && tile[key]>=0),true);
 eq(typeof tile.develop,'boolean');eq(tile.canal || tile.rail,true);
}
for(const route of LINKS) eq(new Set(route.nodes).size===route.nodes.length && route.nodes.every(id=>PLACES.some(p=>p.id===id)),true);
eq(LINK_BY_ID.l30.nodes,['d9','d20','f2']);eq(LINKS.every(link=>link.id==='l30' ? link.nodes.length===3 : link.nodes.length===2),true);
eq(INCOME.slice(0,15),[-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,1,2,2]);eq(INCOME.at(-1),30);
for(const n of [2,3,4]) {
 const s=fresh(n);eq(deckFor(n).length,[40,54,64][n-2]);eq(merchantMix(n).length,[5,7,9][n-2]);
 eq(s.deck.length,[22,27,28][n-2]);eq(s.players.map(p=>[p.hand.length,p.money,p.income]),Array.from({length:n},()=>[8,17,10]));
 eq(s.actionsLeft,1);eq(s.merchants.reduce((v,m)=>v+(m.buys.length>0),0),[3,5,7][n-2]);
 const v=publicView(s,'a');eq('deck' in v,false);eq(v.deckCount,s.deck.length);eq('hand' in v.players[1],false);eq(v.players.every(p=>!('hiddenDiscard' in p)),true);
 eq(JSON.stringify(publicView(JSON.parse(JSON.stringify(s)),'a')),JSON.stringify(v));
 for(const c of deckFor(n)) eq(c.kind==='location'?CITIES.some(p=>p.id===c.location):c.industries.every(t=>t in TILES),true);
}
assert.throws(()=>normalizeConfig({mode:'custom'}),e=>e.code==='CONFIG');checks++;
assert.throws(()=>createGame(people(5),rng(1),{mode:'full'}),e=>e.code==='PLAYERS');checks++;
{
 const s=fixture();const c=card(s,'location','d20');const n=apply(s,'build',{card:c,industry:'cotton',location:'d20',slot:0});
 eq(player(n).money,88);eq(n.buildings[0].tileId,'cotton-1-0');eq(player(n).inventory.cotton.length,10);eq(n.actionsLeft,1);
 rejects(n,'build',{card:card(n,'location','d20'),industry:'cotton',location:'d20',slot:1},'CITY_LIMIT');
 rejects(s,'build',{card:c,industry:'cotton',location:'d20',slot:1.5},'SLOT');
 rejects(s,'pass',{},'TURN','b');
 const poor=structuredClone(s);player(poor).money=1;rejects(poor,'build',{card:c,industry:'cotton',location:'d20',slot:0},'MONEY');
 rejects(s,'build',{industry:'coal',location:'d1',slot:1},'BUILD_CARD');
 rejects(s,'scout',{cards:[c,c,c]},'CARD');
}
{
 const s=fixture();links(s,'l30');eq([...network(s,'a')],['d9','d20']);eq(distances(s,['d9']),{d9:0,d20:1});
 const mine=building(s,'coal',2,'d20','b',1);const far=building(s,'coal',2,'d5','b',2);links(s,'l20');
 eq(resourceOptions(s,'a','coal',['d9']).map(t=>t.id),[mine.id,far.id]);
 const near=building(s,'coal',2,'d9','b',1);eq(resourceOptions(s,'a','coal',['d9']).map(t=>t.id),[near.id]);
 links(s,'l21');
 const remote=building(s,'iron',1,'d7','b',1);eq(resourceOptions(s,'a','iron',[]).map(t=>t.id),[remote.id]);rejects(s,'develop',{industries:['coal'],resources:['market']},'RESOURCE');
 const n=apply(s,'develop',{industries:['coal','coal'],resources:[remote.id,'market']});eq(n.buildings.find(t=>t.id===remote.id).flipped,true);eq(player(n,'b').income,13);eq(player(n).money,98);
 const brew=building(s,'beer',2,'d1','a',1);building(s,'beer',2,'d2','b',1);eq(resourceOptions(s,'a','beer',['d9']).map(t=>t.id),[brew.id]);
 links(s,'l10','l30');const farm=apply(s,'build',{card:card(s),industry:'beer',location:'f2',slot:0});eq(farm.buildings.at(-1).location,'f2');
 rejects(s,'build',{card:card(s,'wild_location'),industry:'beer',location:'f1',slot:0},'BUILD_CARD');
}
{
 const s=fixture();links(s,'l21');const c=card(s,'location','d5');
 const n=apply(s,'build',{card:c,industry:'coal',location:'d5',slot:2});eq(n.markets.coal,14);eq(n.buildings[0].resources,1);eq(player(n).money,96);
 const disconnected=fixture();const b=apply(disconnected,'build',{card:card(disconnected,'location','d5'),industry:'coal',location:'d5',slot:2});eq(b.markets.coal,13);eq(b.buildings[0].resources,2);
 const slots=fixture();rejects(slots,'build',{card:card(slots,'location','d2'),industry:'goods',location:'d2',slot:0},'SLOT_PRIORITY');
 const old=building(s,'coal',1,'d5','a',2,false,2);player(s).inventory.coal.shift();
 const over=apply(s,'build',{card:c,industry:'coal',location:'d5',slot:2});eq(over.buildings.some(t=>t.id===old.id),false);eq(over.buildings.at(-1).tileId,'coal-2-0');
 old.owner='b';rejects(s,'build',{card:c,industry:'coal',location:'d5',slot:2},'OVERBUILD');
 s.markets.coal=0;old.resources=0;eq(apply(s,'build',{card:c,industry:'coal',location:'d5',slot:2}).buildings.at(-1).flipped,true);
}
{
 const s=fixture();s.era='rail';s.markets.coal=14;links(s,'l21');const brewery=building(s,'beer',2,'d1','a',2);
 const n=apply(s,'network',{links:['l20','l30'],resources:['market','market',brewery.id]});eq(player(n).money,83);eq(n.buildings[0].resources,1);eq(n.links.length,4);
 rejects(s,'network',{links:['l20','l30'],resources:['market','market','missing']},'RESOURCE');
 rejects(s,'network',{links:['l20','l3']},'LINK');
 rejects(s,'network',{links:['l30','l20']},'NETWORK');
 const canal=fixture();rejects(canal,'network',{links:['l20','l30']},'LINK');rejects(canal,'network',{links:['l11']},'LINK');
 eq(apply(canal,'network',{links:['l30']}).links,[{id:'l30',owner:'a'}]);
 eq(apply(canal,'network',{links:['l23']}).links,[{id:'l23',owner:'a'}]);eq(apply(canal,'network',{links:['l7']}).links,[{id:'l7',owner:'a'}]);
}
{
 const s=fixture();const tile=building(s,'cotton',1,'d20');links(s,'l29');s.merchants.find(m=>m.id==='p2-0').buys=['cotton'];s.merchants.find(m=>m.id==='p2-0').beer=1;
 const action={sales:[{building:tile.id,merchant:'p2-0',bonus:'coal'}],resources:['m:p2-0']};
 const n=apply(s,'sell',action);eq(n.buildings[0].flipped,true);eq(player(n).income,15);eq(player(n).inventory.coal.length,6);eq(n.merchants.find(m=>m.id==='p2-0').beer,0);
 rejects(s,'sell',{...action,sales:[...action.sales,{building:'missing',merchant:'p2-0'}]},'SELL');
 rejects(s,'sell',{...action,sales:[{...action.sales[0],bonus:'pottery'}]},'CHOOSE_BONUS');
 rejects(s,'develop',{industries:['pottery']},'DEVELOP');
 const zero=fixture();const goods=building(zero,'goods',3,'d2');links(zero,'l7','l33');zero.merchants.find(m=>m.id==='p3-0').buys=['goods'];
 eq(apply(zero,'sell',{sales:[{building:goods.id,merchant:'p3-0'}]}).merchants.find(m=>m.id==='p3-0').beer,1);
 for(const [location,town,routes,bonus,expected] of [['p1','d5',['l21'],'vp',4],['p3','d12',['l33'],'income',7],['p4','d14',['l36'],'money',5],['p5','d7',['l24'],'vp',3]]) {
  const a=fixture();const t=building(a,'cotton',1,town);links(a,...routes);const m=a.merchants.find(m=>m.location===location);m.buys=['cotton'];m.beer=1;
  const b=apply(a,'sell',{sales:[{building:t.id,merchant:m.id}],resources:[`m:${m.id}`]});eq(bonus==='vp'?player(b).vp:bonus==='income'?player(b).income-10:player(b).money-100,expected);
 }
}
{
 const s=fixture();s.era='rail';links(s,'l29','l30');const first=building(s,'cotton',2,'d20'),second=building(s,'cotton',3,'d9');
 const beer=building(s,'beer',2,'d1','a',2);const merchant=s.merchants.find(m=>m.id==='p2-0');merchant.buys=['cotton'];merchant.beer=0;
 const sale={sales:[{building:first.id,merchant:merchant.id},{building:second.id,merchant:merchant.id}],resources:[beer.id,beer.id]};
 const n=apply(s,'sell',sale);eq(n.buildings.every(t=>t.flipped),true);eq(player(n).income,22);eq(n.actionsLeft,1);
 rejects(s,'sell',{...sale,sales:[sale.sales[0],sale.sales[0]]},'SELL');
}
{
 const s=fixture();links(s,'l30','l20','l21');const near=building(s,'coal',2,'d9','b',1),far=building(s,'coal',2,'d5','b',2);player(s).inventory.cotton=player(s).inventory.cotton.filter(id=>TILE_BY_ID[id].level>=2);
 const build={card:card(s,'location','d9'),industry:'cotton',location:'d9',slot:1};
 rejects(s,'build',{...build,resources:[far.id]},'RESOURCE');const n=apply(s,'build',{...build,resources:[near.id]});eq(player(n,'b').income,17);
 const occupied=structuredClone(s);occupied.links.push({id:'l20',owner:'a'});rejects(occupied,'network',{links:['l20']},'LINK');
 const intro=fresh(2,'introductory');intro.players.forEach(p=>{p.income=0;p.money=0;p.hand=[];});intro.deck=[];intro.turnIndex=1;intro.actionsLeft=1;intro.players[1].hand=[{id:'terminal',kind:'industry',industries:['coal']}];
 const ending=applyGameAction(intro,intro.order[1],{type:'fogport_pass',card:'terminal'},rng(1));eq(ending.scoring[0].rows.map(r=>r.bonus),[-10,-10]);
}
{
 const s=fixture();player(s).income=35;const n=apply(s,'loan');eq(player(n).income,28);eq(player(n).money,130);
 player(s).income=2;rejects(s,'loan',{},'LOAN');
 const scout=apply(s,'scout',{cards:player(s).hand.slice(0,3).map(c=>c.id)});eq(player(scout).hand.filter(c=>c.kind.startsWith('wild_')).length,2);eq(scout.wilds,{location:3,industry:3});rejects(scout,'scout',{cards:player(scout).hand.slice(0,3).map(c=>c.id)},'SCOUT');
 const w=player(scout).hand.find(c=>c.kind==='wild_location');eq(apply(scout,'pass',{card:w.id}).wilds.location,4);
}
{
 const s=fixture();s.turnIndex=1;s.actionsLeft=1;player(s,'b').money=0;player(s,'b').income=3;const t=building(s,'cotton',1,'d20','b');
 const pending=applyGameAction(s,'b',{type:'fogport_pass',card:player(s,'b').hand[0].id},rng(1));eq(pending.phase,'liquidation');eq(actorId(pending),'b');
 rejects(pending,'liquidate',{building:t.id},'TURN');
 const n=applyGameAction(JSON.parse(JSON.stringify(pending)),'b',{type:'fogport_liquidate',building:t.id},rng(1));eq(n.phase,'turn');eq(player(n,'b').money,0);eq(player(n,'b').vp,0);eq(n.settlement,null);
 eq(n.history.find(e=>e.type==='shortfall').loss,0);
 const rich=structuredClone(pending);player(rich,'b').vp=10;eq(player(applyGameAction(rich,'b',{type:'fogport_liquidate',building:t.id},rng(1)),'b').vp,9);
}
{
 const terminal=mode=>{const s=fixture();s.mode=mode;s.era=mode==='full'?'rail':'canal';s.deck=[];s.turnIndex=1;s.actionsLeft=1;player(s).hand=[];player(s,'b').hand=[player(s,'b').hand[0]];return s;};
 const s=terminal('full');building(s,'cotton',2,'d20','a',0,true);building(s,'beer',2,'f2','b',0,true);links(s,'l30','l29');
 const n=applyGameAction(s,'b',{type:'fogport_pass',card:player(s,'b').hand[0].id},rng(1));eq(n.phase,'finished');eq(n.scoring[0].rows,[{playerId:'a',links:8,industries:5,bonus:0},{playerId:'b',links:0,industries:5,bonus:0}]);eq(player(n).money,100);
 const intro=terminal('introductory');building(intro,'cotton',2,'d20','a',0,false);player(intro).money=80;player(intro).income=14;
 const ending=applyGameAction(intro,'b',{type:'fogport_pass',card:player(intro,'b').hand[0].id},rng(1));eq(ending.scoring[0].rows[0].bonus,22);eq(ending.era,'canal');
 const tie=terminal('full');player(tie).money=0;player(tie,'b').money=10;player(tie).income=35;player(tie,'b').income=34;eq(applyGameAction(tie,'b',{type:'fogport_pass',card:player(tie,'b').hand[0].id},rng(1)).result.winners,['a']);
}
// Fixed seeds run all player counts and both complete modes through round/era transitions.
for(const n of [2,3,4]) for(const mode of ['full','introductory']) {
 let s=fresh(n,mode),steps=0;const random=rng(n*77);const initial=JSON.stringify(s);
 while(s.phase!=='finished' && steps<200) {const id=actorId(s);const p=player(s,id);s=applyGameAction(s,id,{type:'fogport_pass',card:p.hand[0].id},random,steps++);s=JSON.parse(JSON.stringify(s));}
 eq(s.phase,'finished');eq(s.scoring.length,mode==='full'?2:1);eq(steps,mode==='full'?deckFor(n).length*2-n:deckFor(n).length-n);eq(s.players.every(p=>p.hand.length===0),true);eq(s.links,[]);assert.notEqual(JSON.stringify(s),initial);checks++;
}
// Preview chooses ordered resources without touching authoritative state.
{
 const s=fixture();building(s,'iron',1,'d1','a',1);building(s,'iron',1,'d7','b',1);const before=JSON.stringify(s);const a=command(s,'develop',{industries:['coal']});const p=previewAction(publicView(s,'a'),'a',a);eq(p.error,'CHOOSE_RESOURCE');eq(p.detail.choices.length,2);eq(previewAction(publicView(s,'a'),'a',{...a,resources:[p.detail.choices[0].id]}).valid,true);eq(JSON.stringify(s),before);
 eq(abortGame(s).result,{winners:[],reason:'aborted'});
 eq(previewAction(reactive(publicView(s,'a')),'a',command(s,'loan')).valid,true);
 player(s).income=99;s.buildings=s.buildings.slice(0,1);eq(player(apply(s,'develop',{industries:['coal']})).income,99);
}
// Actual room adapter: ready-reset, stage expiry, hidden information and restart.
{
 const seats=people(2).map(p=>({...createPlayer(p.nickname,`hash-${p.id}`),online:true}));let room=createRoom('ABCDEFGH','fogport',seats[0],0);room.players.push({...seats[1],seat:1});
 const run=(id,type,payload={})=>{room=applyRoomAction(room,id,{id:crypto.randomUUID(),stage:room.stage,type,...payload},10).room;};
 eq(room.gameConfig,{mode:'full'});run(seats[0].id,'configure',{config:{mode:'introductory'}});eq(room.players.every(p=>!p.ready),true);room.players.forEach(p=>{p.ready=true;});run(seats[0].id,'start');
 const stage=room.stage;const id=actorId(room.gameState);run(id,'fogport_pass',{card:player(room.gameState,id).hand[0].id});eq(room.stage,stage+1);
 assert.throws(()=>applyRoomAction(room,id,{id:crypto.randomUUID(),stage,type:'fogport_pass',card:'old'},12),e=>e.code==='STALE');checks++;
 eq(roomView(room,seats[0].id).game.players.filter(p=>p.id!==seats[0].id).every(p=>!p.hand),true);
 run(seats[0].id,'end');run(seats[0].id,'quick_start');eq(room.gameState.mode,'introductory');eq(room.gameState.buildings,[]);run(seats[0].id,'end');run(seats[0].id,'restart');eq(room.status,'lobby');
}
const maximal={id:crypto.randomUUID(),stage:99,type:'fogport_sell',card:'c63',sales:Array.from({length:45},(_,i)=>({building:`b${i+1}`,merchant:'p2-1',bonus:'cotton'})),resources:Array.from({length:90},()=> 'b180')};
eq(Buffer.byteLength(JSON.stringify(maximal))<=4096,true);
// Varied legal games exercise ordinary card exhaustion, construction and scoring together.
const exercised=new Set();
function solve(s,id,action) {
 const a=structuredClone(action);
 for(let i=0;i<100;i++) {
  const p=previewAction(publicView(s,id),id,a);
  if(p.valid) return a;
  if(p.error==='CHOOSE_RESOURCE') a.resources=[...p.detail.selected,p.detail.choices[0].id];
  else if(p.error==='CHOOSE_BONUS') a.sales[p.detail.sale].bonus=p.detail.choices[0];
  else return null;
 }
 throw new Error('Resource preview failed to converge');
}
for(const n of [2,3,4]) {
 let s=fresh(n),steps=0;const random=rng(n*432);
 while(s.phase!=='finished' && steps<400) {
  const id=actorId(s),p=player(s,id);let chosen;
  if(s.phase==='liquidation') chosen={type:'fogport_liquidate',building:s.buildings.find(b=>b.owner===id).id};
  else {
   const proposals=[];const c=p.hand[0].id;
   for(const tile of s.buildings.filter(b=>b.owner===id && !b.flipped)) for(const m of s.merchants) proposals.push({type:'fogport_sell',card:c,sales:[{building:tile.id,merchant:m.id}]});
   for(const hand of p.hand) for(const type of Object.keys(TILES)) for(const target of buildingTargets(s,id,hand.id,type).slice(0,2)) proposals.push({type:'fogport_build',card:hand.id,industry:type,...target});
   for(const link of LINKS) proposals.push({type:'fogport_network',card:c,links:[link.id]});
   for(const type of Object.keys(TILES)) proposals.push({type:'fogport_develop',card:c,industries:[type]});
   if(steps%13===0) proposals.unshift({type:'fogport_scout',cards:p.hand.slice(0,3).map(c=>c.id)});
   if(p.money<20) proposals.unshift({type:'fogport_loan',card:c});
   // Rotate candidate priority with a fixed source so resources and transport vary.
   const pivot=random(proposals.length);const ordered=[...proposals.slice(pivot),...proposals.slice(0,pivot)];
   for(const a of ordered) {chosen=solve(s,id,a);if(chosen) break;}
   chosen??={type:'fogport_pass',card:c};
  }
  exercised.add(chosen.type);s=applyGameAction(s,id,chosen,random,steps++);s=JSON.parse(JSON.stringify(s));
 }
 eq(s.phase,'finished');eq(s.scoring.length,2);eq(s.players.every(p=>Number.isInteger(p.money) && p.money>=0),true);
}
for(const type of ['fogport_build','fogport_network','fogport_develop','fogport_sell','fogport_loan','fogport_scout']) eq(exercised.has(type),true);
// Guided UI choices: run these independently when only the interaction layer changes.
{
 const state=publicView(fixture(),'a'),before=JSON.stringify(state),choices=legalActions(state,'a','build');
 eq(choices.length>0,true);eq(choices.every(c=>previewAction(state,'a',c).valid),true);eq(JSON.stringify(state),before);
 eq(legalActions(state,'b','build'),[]);eq(unavailableReason(state,'b','build'),'TURN');
 player(state).money=0;eq(legalActions(state,'a','build'),[]);
 player(state).money=100;player(state).inventory.pottery=['pottery-5-0'];eq(legalActions(state,'a','build',{industry:'pottery'}),[]);eq(unavailableReason(state,'a','build',{industry:'pottery'}),'ERA');
}
{
 const s=fixture();building(s,'cotton',1,'d2');building(s,'cotton',1,'d20');const beer=building(s,'beer',1,'f1','a',1);
 links(s,'l10','l29');for(const m of s.merchants.filter(m=>m.location==='p2')) {m.buys=['cotton'];m.beer=m.id==='p2-0' ? 1 : 0;}
 const view=publicView(s,'a'),first=completeAction(view,'a',command(view,'sell',{sales:[{building:s.buildings[0].id,merchant:'p2-0',bonus:''}],resources:[]}));
 eq(first.valid,true);eq(bonusChoices(view,'a',first.command,0).length>0,true);
 const second=completeAction(view,'a',{...first.command,sales:[...first.command.sales,{building:s.buildings[1].id,merchant:'p2-1',bonus:''}],resources:[]});
 eq(second.valid,true);eq(second.command.resources,['m:p2-0',beer.id]);eq(resourceSteps(view,'a',second.command)[0].choices.map(c=>c.id),['m:p2-0']);
 eq(completeAction(view,'a',{...second.command,resources:[beer.id]}).valid,false);
 eq(extensions(view,'a',first.command).some(c=>c.sales.length===2 && previewAction(view,'a',c).valid),true);
}
{
 const s=fixture();s.era='rail';building(s,'coal',2,'d20','a',2);building(s,'beer',2,'d2','a',1);
 const view=publicView(s,'a'),one=completeAction(view,'a',command(view,'network',{links:['l10'],resources:[]}));
 eq(one.valid,true);eq(extensions(view,'a',one.command).some(c=>c.links[1]==='l29' && previewAction(view,'a',c).valid),true);
 const dev=completeAction(view,'a',command(view,'develop',{industries:['iron'],resources:[]}));eq(dev.valid,true);eq(extensions(view,'a',dev.command).some(c=>c.industries[1]==='iron'),true);
}
for(const place of PLACES) eq(MAP_POINTS[place.id]?.every(n=>n>=0 && n<=1000),true);
for(const era of ['canal','rail']) for(const link of LINKS.filter(l=>l[era])) {
 const branches=routeBranches(link,era);
 eq([branches[0][0].x,branches[0][0].y],MAP_POINTS[link.nodes[0]]);eq([branches[0].at(-1).x,branches[0].at(-1).y],MAP_POINTS[link.nodes[1]]);
 eq(branches.length,link.id==='l30'?2:1);eq(link.nodes.length,link.id==='l30'?3:2);eq(routeSegments(link,era).every(s=>s.length>0 && Number.isFinite(s.angle)),true);
}
{
 const s=fixture();player(s).hand=[{id:'only-city',kind:'location',location:'d2'}];
 eq(legalActions(s,'a','build',{industry:'beer',location:'f1'}),[]);eq(unavailableReason(s,'a','build',{industry:'beer',location:'f1'}),'NO_CARD');
 eq(legalActions(s,'a','build',{industry:'pottery',location:'d2',slot:0}),[]);eq(unavailableReason(s,'a','build',{industry:'pottery',location:'d2',slot:0}),'SLOT');
}
// End guided UI choices.

// The original-layout map restores Leek while keeping component IDs and names.
eq(CITIES.some(place=>place.id==='d10'),true);
eq(LINKS.some(link=>link.nodes.includes('d10')),true);
// Era-scoped corridors and the southern farm junction are versioned in snapshots.
eq(new Set(LINKS.map(link=>[...link.nodes].sort().join('-'))).size,39);
{
 const s=fixture();eq(s.boardVersion,BOARD_VERSION);eq(publicView(JSON.parse(JSON.stringify(s)),'a').boardVersion,BOARD_VERSION);
 const old=structuredClone(s);delete old.boardVersion;
 rejects(old,'pass',{},'BOARD_VERSION');eq(legalActions(old,'a','network'),[]);eq(unavailableReason(old,'a','network'),'BOARD_VERSION');eq(abortGame(old).phase,'finished');
 const ids=player(s).hand.map(c=>c.id);
 for(const count of [0,1,2,4]) rejects(s,'scout',{cards:ids.slice(0,count)},'CARD');
 for(const era of ['canal','rail']) {
  const state=fixture();state.era=era;const mine=building(state,'coal',2,'d14','a',2);
  const action=completeAction(publicView(state,'a'),'a',command(state,'network',{links:['l35']}));
  eq(action.valid,true);eq(action.command.links,['l35']);
  const built=applyGameAction(state,'a',action.command,rng(1));eq(built.links,[{id:'l35',owner:'a'}]);eq(player(built).money,era==='canal'?97:95);eq(built.buildings.find(b=>b.id===mine.id).resources,era==='canal'?2:1);
 }
}
{
 const s=fixture(),game=ref(publicView(s,'a')),mode=useActionMode(game,ref('a'));
 eq(mode.begin('build'),true);
 const first=mode.commands.value[0],target={kind:'slot',location:first.location,slot:first.slot};
 eq(mode.targets.value.includes(`slot:${first.location}:${first.slot}`),true);
 eq(mode.matching({kind:'slot',location:'missing',slot:0}),[]);
 eq(mode.chooseTarget(target),true);eq(previewAction(game.value,'a',mode.mode.value.command).valid,true);
 eq(mode.begin('build',{card:first.card,industry:first.industry}),true);
 eq(mode.matching(target).length>0,true);eq(mode.chooseTarget(target),true);
 eq(mode.begin('develop'),true);eq(mode.chooseIndustry(mode.industries.value[0]),true);
 eq(mode.add(),true);eq(mode.chooseIndustry(mode.industries.value[0]),true);eq(mode.mode.value.command.industries.length,2);
 mode.reset();eq(mode.targets.value,[]);eq(mode.cards.value,[]);
 eq(JSON.stringify(game.value),JSON.stringify(publicView(s,'a')));
}
{
 const s=fixture();const sale=building(s,'cotton',1,'d20');links(s,'l29');
 for(const merchant of s.merchants.filter(m=>m.location==='p2')) {merchant.buys=['cotton'];merchant.beer=1;}
 const game=ref(publicView(s,'a')),mode=useActionMode(game,ref('a'));
 eq(mode.begin('sell'),true);eq(mode.targets.value.includes('building:'+sale.id),true);
 eq(mode.chooseTarget({kind:'building',id:sale.id}),true);eq(mode.mode.value.building,sale.id);
 eq(mode.targets.value.some(key=>key.startsWith('merchant:')),true);
 eq(mode.chooseTarget({kind:'merchant',id:mode.commands.value[0].sales[0].merchant}),true);
 eq(previewAction(game.value,'a',mode.mode.value.command).valid,true);
}

// Operation contexts: explicit switches replace the entire context; objects never switch actions.
{
 const s=fixture(),cityCard=card(s,'location','d20'),game=ref(publicView(s,'a')),ui=useActionMode(game,ref('a'));
 eq(ui.context.value.kind,'idle');eq(ui.begin('build',{card:cityCard}),true);
 const build=ui.commands.value[0],slot={kind:'slot',location:build.location,slot:build.slot};
 eq(ui.chooseTarget(slot),true);eq(ui.selectedTargets.value.length>0,true);ui.hover(`slot:${slot.location}:${slot.slot}`);
 eq(ui.begin('network'),true);eq(ui.context.value.filter,{});eq(ui.context.value.selection,null);eq(ui.hoverTarget.value,null);eq(ui.selectedTargets.value,[]);
 eq(ui.targets.value.every(key=>key.startsWith('link:')),true);eq(ui.matching(slot),[]);eq(ui.replace(build),false);
 eq(ui.beginDrag({kind:'industry',industry:'cotton'}),false);eq(ui.context.value.kind,'network');ui.hover(`place:${slot.location}`);eq(ui.hoverTarget.value,null);
 eq(ui.beginDrag({kind:'card',id:cityCard}),true);eq(ui.context.value.selection.kind,'card');eq(ui.context.value.kind,'network');
 eq(ui.begin('build'),false);eq(ui.inspect(null,'Card',[]),false);eq(ui.context.value.kind,'network');
 ui.finishDrag(false);eq(ui.context.value.kind,'idle');eq(ui.targets.value,[]);eq(ui.selected.value,null);eq(ui.dragTarget.value,null);
 eq(ui.begin('build',{card:cityCard}),true);eq(ui.beginDrag({kind:'link'}),false);eq(ui.context.value.kind,'build');
 ui.reset();eq(ui.beginDrag({kind:'card',id:cityCard}),true);eq(ui.context.value.origin,'drag');eq(ui.context.value.selection,{kind:'card',id:cityCard});
 ui.dragOver(slot);eq(ui.matching(slot).length>0,true);eq(ui.chooseTarget(slot),true);ui.finishDrag(true);
 eq(ui.context.value.phase,'review');eq(previewAction(game.value,'a',ui.mode.value.command).valid,true);eq(ui.context.value.selection.kind,'card');eq(ui.dragTarget.value,null);
 const token=ui.beginSubmit('fogport_build');eq(Boolean(token),true);eq(ui.submitting.value,true);eq(ui.context.value.phase,'submitting');eq(ui.begin('network'),false);eq(ui.beginDrag({kind:'card',id:cityCard}),false);
 ui.endSubmit(token,false);eq(ui.context.value.phase,'review');eq(ui.submitting.value,false);
 const saved=ui.beginSubmit('fogport_build');ui.endSubmit(saved,true);eq(ui.context.value.kind,'idle');eq(ui.selected.value,null);
 ui.reset();eq(ui.beginDrag({kind:'industry',industry:'cotton'}),true);eq(ui.context.value.selection.kind,'industry');
 ui.dragOver({kind:'link',id:'l29'});eq(ui.hoverTarget.value,null);eq(ui.matching({kind:'link',id:'l29'}),[]);ui.finishDrag(false);eq(ui.context.value.kind,'idle');
 ui.inspect({kind:'card',id:cityCard},'Card',[{kind:'loan'}]);eq(ui.mode.value,null);eq(ui.targets.value,[]);eq(ui.context.value.kind,'inspect');
 eq(ui.begin('loan'),true);eq(ui.menu.value,null);eq(ui.draft.value.kind,'loan');eq(ui.mode.value,null);
 const canceled=ui.beginSubmit('fogport_loan');ui.reset();eq(ui.begin('network'),false);ui.endSubmit(canceled,false);eq(ui.context.value.kind,'idle');eq(ui.submitting.value,false);
 eq(ui.begin('network'),true);eq(ui.draft.value,null);eq(ui.begin('build',{location:'missing'}),false);eq(ui.context.value.kind,'idle');
 eq(ui.begin('develop'),true);eq(ui.chooseIndustry('coal'),true);eq(ui.add(),true);eq(ui.beginDrag({kind:'industry',industry:'coal'}),true);
 eq(ui.chooseTarget({kind:'develop'}),true);ui.finishDrag(true);eq(ui.mode.value.command.industries,['coal','coal']);
 game.value=publicView(JSON.parse(JSON.stringify(s)),'a');eq(ui.context.value.kind,'idle');eq(ui.selectedTargets.value,[]);
}
{
 const s=fixture(),tile=building(s,'cotton',1,'d20');links(s,'l29');
 s.merchants.filter(m=>m.location==='p2').forEach(m=>{m.buys=['cotton'];m.beer=1;});
 const ui=useActionMode(ref(publicView(s,'a')),ref('a'));
 eq(ui.beginDrag({kind:'building',id:tile.id}),true);eq(ui.mode.value.building,tile.id);eq(ui.mode.value.command,null);
 eq(ui.targets.value.every(key=>key.startsWith('merchant:') || key.startsWith('place:')),true);
 eq(ui.matching({kind:'slot',location:'d20',slot:0}),[]);eq(ui.beginDrag({kind:'industry',industry:'cotton'}),false);
 eq(ui.chooseTarget({kind:'merchant',id:ui.commands.value[0].sales[0].merchant}),true);ui.finishDrag(true);eq(ui.context.value.phase,'review');
 ui.reset();eq(ui.menu.value,null);eq(ui.draft.value,null);eq(ui.hoverTarget.value,null);
}
// End operation context checks.

// Pointer termination feeds the same operation context on success, invalid drop and cancellation.
{
 const savedWindow=globalThis.window,savedDocument=globalThis.document,listeners=new Map();let hit=null,drag;
 globalThis.window={addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
 globalThis.document={elementFromPoint:()=>hit};
 const s=fixture(),cityCard=card(s,'location','d20'),ui=useActionMode(ref(publicView(s,'a')),ref('a'));
 const source={getBoundingClientRect:()=>({left:0,top:0,width:90,height:150}),closest:()=>null,setPointerCapture(){},hasPointerCapture:()=>false};
 const event=(x,y,extra={})=>({button:0,pointerId:1,clientX:x,clientY:y,pointerType:'mouse',currentTarget:source,stopPropagation(){},preventDefault(){},...extra});
 const renderer=createRenderer({createComment:()=>({}),insert(){},remove(){},parentNode:()=>null,nextSibling:()=>null,setText(){},setComment(){}});
 const app=renderer.createApp({setup(){drag=usePointerDrag((payload,value)=>value ? ui.chooseTarget(hit.target) : false,payload=>ui.beginDrag(payload),position=>ui.dragOver(position ? hit?.target??null : null),ui.finishDrag);return ()=>null;}});
 try {
  app.mount({});
  function lift() {drag.start(event(5,5),{kind:'card',id:cityCard},'Card');listeners.get('pointermove')(event(25,30));eq(drag.ghost.value.payload.kind,'card');eq(drag.clickAllowed(),false);}
  lift();const row=ui.commands.value[0];hit={target:{kind:'slot',location:row.location,slot:row.slot},dataset:{fogportDrop:`slot:${row.location}:${row.slot}`},closest(){return this;}};
  listeners.get('pointermove')(event(30,40));eq(ui.hoverTarget.value,hit.dataset.fogportDrop);listeners.get('pointerup')(event(30,40));eq(ui.context.value.phase,'review');eq(drag.ghost.value,null);
  ui.reset();hit=null;lift();listeners.get('pointerup')(event(30,40));eq(ui.context.value.kind,'idle');eq(ui.targets.value,[]);eq(drag.ghost.value.returning,true);drag.cancel();
  lift();listeners.get('pointercancel')(event(30,40));eq(ui.context.value.kind,'idle');eq(ui.selected.value,null);drag.cancel();
  lift();listeners.get('keydown')({key:'Escape'});eq(ui.context.value.kind,'idle');eq(ui.hoverTarget.value,null);drag.cancel();
  lift();app.unmount();eq(ui.context.value.kind,'idle');eq(drag.ghost.value,null);eq(listeners.size,0);
 } finally {app.unmount();if(savedWindow===undefined) delete globalThis.window;else globalThis.window=savedWindow;if(savedDocument===undefined) delete globalThis.document;else globalThis.document=savedDocument;}
}
// End pointer context checks.

// Corridors change transport type with the era; exclusive corridors stay exclusive.
eq(LINKS.filter(l=>l.canal).every(l=>linkKind(l,'canal')==='canal'),true);
eq(LINKS.filter(l=>l.rail).every(l=>linkKind(l,'rail')==='railway'),true);
eq(['both','railOnly','canalOnly'].map(scope=>LINKS.filter(l=>l.scope===scope).length),[31,7,1]);
{
 const canal=fixture();rejects(canal,'network',{links:['l11']},'LINK');
 const rail=fixture();rail.era='rail';rejects(rail,'network',{links:['l3']},'LINK');
 const built=apply(rail,'network',{links:['l24'],resources:['market']});
 eq(player(built).money,94);eq([...network(built,'a')],['d7','p5']);
 const farm=apply(canal,'network',{links:['l30']});
 eq([...network(farm,'a')],['d9','d20','f2']);eq(distances(farm,['f2']),{f2:0,d9:1,d20:1});
 eq(farm.links.length,1);rejects(farm,'network',{links:['l30']},'LINK');
 eq(JSON.parse(JSON.stringify(publicView(built,'a'))).boardVersion,BOARD_VERSION);
}
for(const era of ['canal','rail']) for(const link of LINKS.filter(l=>l[era])) {
 const branches=routeBranches(link,era);eq(branches.length,link.id==='l30'?2:1);
 eq([branches[0][0].x,branches[0][0].y],MAP_POINTS[link.nodes[0]]);
 eq([branches[0].at(-1).x,branches[0].at(-1).y],MAP_POINTS[link.nodes[1]]);
 eq(routeSegments(link,era).every(segment=>segment.length>0 && Number.isFinite(segment.angle)),true);
}
// End corridor checks.

// Private liquidation shares the map context, submits directly, and resumes after snapshots.
{
 const s=fixture();s.phase='liquidation';s.settlement={queue:['a','b'],playerId:'a',debt:10};player(s).money=0;player(s).income=0;
 const first=building(s,'cotton',1,'d20'),second=building(s,'cotton',1,'d5'),foreign=building(s,'beer',1,'d3','b');
 second.flipped=true;
 const before=JSON.stringify(s),a=publicView(s,'a'),b=publicView(s,'b');
 eq(a.settlement,{playerId:'a',debt:10});eq(b.settlement,{playerId:'a'});
 eq('hand' in b.players[0],false);eq('hand' in a.players[1],false);eq('deck' in a,false);eq('queue' in a.settlement,false);
 eq(JSON.stringify(s),before);eq(liquidationOptions(b,'b'),[]);eq(liquidationOptions(s,'b'),[]);
 eq(liquidationOptions(a,'a').map(c=>[c.building,c.cost,c.amount,c.remaining]),[[first.id,12,6,4],[second.id,12,6,4]]);
 const game=ref(a),ui=useActionMode(game,ref('a')),other=useActionMode(ref(b),ref('b'));
 eq(ui.activeKind.value,'liquidate');eq(other.activeKind.value,'');eq(other.targets.value,[]);
 eq(ui.targets.value,['building:'+first.id,'building:'+second.id]);eq(ui.cards.value,[]);eq(ui.industries.value,[]);eq(ui.draft.value,null);eq(ui.menu.value,null);
 eq(ui.begin('network'),false);eq(ui.begin('build'),false);eq(ui.inspect(null,'Card',[]),false);eq(ui.beginDrag({kind:'card',id:player(s).hand[0].id}),false);
 eq(ui.matching({kind:'link',id:'l29'}),[]);eq(ui.chooseTarget({kind:'building',id:foreign.id}),false);
 eq(ui.chooseTarget({kind:'building',id:first.id}),true);eq(ui.context.value.phase,'select');eq(ui.selectedTargets.value,['building:'+first.id]);
 ui.hover('building:'+first.id);eq(ui.hoverTarget.value,'building:'+first.id);eq(other.hoverTarget.value,null);eq(JSON.stringify(s),before);
 const failed=ui.beginSubmit('fogport_liquidate');eq(!!failed,true);eq(ui.targets.value,[]);eq(ui.chooseTarget({kind:'building',id:second.id}),false);
 ui.endSubmit(failed,false);eq(ui.activeKind.value,'liquidate');eq(ui.selectedTargets.value,[]);eq(ui.targets.value.length,2);
 eq(ui.chooseTarget({kind:'building',id:first.id}),true);const token=ui.beginSubmit('fogport_liquidate');
 const next=applyGameAction(s,'a',{type:'fogport_liquidate',building:first.id},rng(1));
 eq(next.phase,'liquidation');eq(player(next).money,6);eq(next.buildings.some(t=>t.id===first.id),false);
 game.value=publicView(JSON.parse(JSON.stringify(next)),'a');ui.endSubmit(token,true);
 eq(ui.activeKind.value,'liquidate');eq(ui.targets.value,['building:'+second.id]);eq(ui.commands.value[0].remaining,0);eq(ui.hoverTarget.value,null);
 eq(publicView(next,'b').settlement,{playerId:'a'});eq(next.history.at(-1).type,'liquidate');eq(next.history.at(-1).amount,6);
 eq(ui.chooseTarget({kind:'building',id:second.id}),true);const final=ui.beginSubmit('fogport_liquidate');
 const done=applyGameAction(next,'a',{type:'fogport_liquidate',building:second.id},rng(1));game.value=publicView(done,'a');ui.endSubmit(final,true);
 eq(done.phase,'turn');eq(done.settlement,null);eq(player(done).money,2);eq(ui.activeKind.value,'');eq(ui.targets.value,[]);eq(ui.selectedTargets.value,[]);eq(ui.commands.value,[]);
 const reconnect=useActionMode(ref(publicView(JSON.parse(JSON.stringify(next)),'a')),ref('a'));eq(reconnect.activeKind.value,'liquidate');eq(reconnect.targets.value,['building:'+second.id]);
 ui.reset();eq(ui.activeKind.value,'');
 const room=createRoom('ABCDEFGH','fogport',{...createPlayer('A','hash-a',0),id:'a'},0);room.players.push({...createPlayer('B','hash-b',0),id:'b',seat:1});room.gameState=s;room.status='playing';
 eq(roomView(room,'b').game.settlement,{playerId:'a'});eq(roomView(room,'a').game.settlement.debt,10);
}
// End private liquidation checks.

console.log(`Fogport: ${checks} assertions passed (data, every action, atomicity, resources, scoring, debt recovery, privacy, rooms and nine complete seeded games).`);
