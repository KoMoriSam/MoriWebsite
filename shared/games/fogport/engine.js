import { CITIES, FARMS, PORTS, PLACE_BY_ID, LINKS, LINK_BY_ID, INDUSTRIES, TILES, TILE_BY_ID, MARKET_PRICES, INCOME, incomeLevel, topIncomePosition, deckFor, merchantMix, RULES_VERSION, BOARD_VERSION } from './data.js';

export class FogportError extends Error {
  constructor(code, detail = null) { super(code); this.code = code; this.detail = detail; }
}
const requireRule = (condition, code, detail) => { if (!condition) throw new FogportError(code, detail); };
const own = (state,id) => state.players.find(player => player.id === id);
// Snapshots are JSON records; this also accepts Vue proxies in local previews.
const copyState=state=>JSON.parse(JSON.stringify(state));
export const tileData = tile => TILE_BY_ID[tile.tileId];
export const actorId = state => state.phase === 'liquidation' ? state.settlement.playerId : state.phase === 'turn' ? state.order[state.turnIndex] : null;
export function shuffle(values, rng) {
  const result = [...values];
  for (let i=result.length-1;i>0;i--) { const j=rng(i+1); requireRule(Number.isInteger(j) && j>=0 && j<=i,'RANDOM'); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
}
export function normalizeConfig(config = { mode: 'full' }) {
  requireRule(config && typeof config === 'object' && !Array.isArray(config) && ['full','introductory'].includes(config.mode),'CONFIG');
  return { mode: config.mode };
}
export function createGame(players, rng, config, now = Date.now()) {
  requireRule(players.length >= 2 && players.length <= 4 && new Set(players.map(p=>p.id)).size === players.length,'PLAYERS');
  const deck = shuffle(deckFor(players.length),rng);
  const mix = shuffle(merchantMix(players.length),rng);
  const state = { rulesVersion: RULES_VERSION, boardVersion:BOARD_VERSION, mode: normalizeConfig(config).mode, era: 'canal', eraRound: 1, phase: 'turn', turnIndex: 0, actionsLeft: 1,
    order: shuffle(players.map(p=>p.id),rng), deck, buildings: [], links: [], nextBuilding: 1, history: [], scoring: [], result: null, settlement: null,
    wilds: { location: 4, industry: 4 }, markets: { coal: 13, iron: 8 }, merchants: [],
    players: players.map((p,index) => ({ id:p.id, nickname:p.nickname, seat:index, money:17, income:10, vp:0, spent:0, hand:deck.splice(0,8), discard:[], hiddenDiscard:deck.shift(), inventory:Object.fromEntries(INDUSTRIES.map(type=>[type,TILES[type].map(t=>t.id)])) })),
  };
  for (const port of PORTS) for (let i=0;i<port.slots;i++) {
    const buys = players.length >= port.minPlayers ? mix.shift() : [];
    state.merchants.push({ id:`${port.id}-${i}`, location:port.id, buys, beer:buys.length ? 1 : 0 });
  }
  event(state,{type:'start',playerId:state.order[0]},now);
  return state;
}
function event(state,entry,now) { state.history.push({ ...entry, at:now, era:state.era, eraRound:state.eraRound, id:state.history.length }); }
export function distances(state, starts) {
  const distance = Object.fromEntries(starts.map(id=>[id,0])); const queue=[...starts];
  for (let i=0;i<queue.length;i++) for (const built of state.links) {
    const nodes=LINK_BY_ID[built.id].nodes;
    if (!nodes.includes(queue[i])) continue;
    for (const next of nodes) if (distance[next] === undefined) { distance[next]=distance[queue[i]]+1; queue.push(next); }
  }
  return distance;
}
export function network(state,id) {
  return new Set([...state.buildings.filter(t=>t.owner===id).map(t=>t.location), ...state.links.filter(l=>l.owner===id).flatMap(l=>LINK_BY_ID[l.id].nodes)]);
}
export function canReach(state, starts, destination) { return Object.hasOwn(distances(state,starts),destination); }
function advanceIncome(player,spaces) { player.income=Math.min(INCOME.length-1,player.income+spaces); }
function flip(state,building) {
  if (building.flipped) return;
  building.flipped=true; advanceIncome(own(state,building.owner),tileData(building).income);
}
function pay(player,amount) { requireRule(Number.isInteger(amount) && amount>=0 && player.money>=amount,'MONEY'); player.money-=amount; player.spent+=amount; }
export function resourceOptions(state,id,type,starts,merchantId = null) {
  const connected=distances(state,starts);
  let candidates=state.buildings.filter(tile=>tileData(tile).type===type && tile.resources>0 && !tile.flipped);
  if (type === 'coal') {
    candidates=candidates.filter(tile=>connected[tile.location]!==undefined);
    if (candidates.length) { const nearest=Math.min(...candidates.map(t=>connected[t.location])); return candidates.filter(t=>connected[t.location]===nearest).map(t=>({ id:t.id, owner:t.owner, location:t.location, price:0 })); }
    if (!PORTS.some(port=>connected[port.id]!==undefined)) return [];
  }
  if (type === 'iron' || type === 'coal') {
    if (candidates.length) return candidates.map(t=>({id:t.id,owner:t.owner,location:t.location,price:0}));
    const count=state.markets[type]; const prices=MARKET_PRICES[type];
    return [{ id:'market', price:count ? prices[prices.length-count] : type==='coal' ? 8 : 6 }];
  }
  candidates=candidates.filter(tile=>tile.owner===id || connected[tile.location]!==undefined);
  const choices=candidates.map(t=>({id:t.id,owner:t.owner,location:t.location,price:0}));
  const merchant=state.merchants.find(m=>m.id===merchantId);
  if (merchant?.beer && connected[merchant.location]!==undefined) choices.push({id:`m:${merchant.id}`,location:merchant.location,price:0});
  return choices;
}
function consume(state,player,type,starts,context,merchantId=null) {
  const choices=resourceOptions(state,player.id,type,starts,merchantId);
  requireRule(choices.length,'RESOURCE',{resource:type});
  let source=context.values[context.index];
  if (source === undefined) {
    if (choices.length>1) throw new FogportError('CHOOSE_RESOURCE',{resource:type,choices,index:context.index,selected:[...context.used]});
    source=choices[0].id;
  }
  context.used.push(source); context.index++;
  const choice=choices.find(c=>c.id===source); requireRule(choice,'RESOURCE',{resource:type});
  context.plan.push({type,location:choice.location??null,owner:choice.owner??null,market:source==='market',merchant:source.startsWith('m:')});
  if (source==='market') { pay(player,choice.price); state.markets[type]=Math.max(0,state.markets[type]-1); }
  else if (source.startsWith('m:')) state.merchants.find(m=>m.id===source.slice(2)).beer--;
  else { const building=state.buildings.find(t=>t.id===source); building.resources--; if(!building.resources) flip(state,building); }
  return source;
}
function takeInventory(player,type,develop=false) {
  requireRule(INDUSTRIES.includes(type),'INDUSTRY'); const id=player.inventory[type][0]; requireRule(id,'INVENTORY');
  const data=TILE_BY_ID[id]; requireRule(!develop || data.develop,'DEVELOP'); player.inventory[type].shift(); return data;
}
function discardCards(state,player,ids,count) {
  requireRule(Array.isArray(ids) && ids.length===count && new Set(ids).size===count,'CARD');
  const cards=ids.map(id=>player.hand.find(card=>card.id===id)); requireRule(cards.every(Boolean),'CARD');
  for(const card of cards) {
    player.hand.splice(player.hand.findIndex(c=>c.id===card.id),1);
    if(card.kind.startsWith('wild_')) state.wilds[card.kind.slice(5)]++; else player.discard.push(card);
  }
  return cards;
}
function validBuildCard(state,player,card,location,type) {
  const farm=FARMS.some(f=>f.id===location);
  if(card.kind==='location') return !farm && card.location===location;
  if(card.kind==='wild_location') return !farm;
  if(card.kind==='industry' || card.kind==='wild_industry') {
    return (card.kind==='wild_industry' || card.industries.includes(type)) && (network(state,player.id).size===0 || network(state,player.id).has(location));
  }
  return false;
}
export function buildingTargets(state,id,cardId,type) {
  const player=own(state,id); const card=player?.hand?.find(c=>c.id===cardId); const data=TILE_BY_ID[player?.inventory[type]?.[0]];
  if(!card || !data || !data[state.era]) return [];
  return [...CITIES,...FARMS].flatMap(place=>place.slots.flatMap((allowed,slot)=> {
    if(!allowed.includes(type) || !validBuildCard(state,player,card,place.id,type)) return [];
    try {
      validateSlot(state,player,place,slot,data);
      return actionAvailable(state,id,{type:'fogport_build',card:cardId,industry:type,location:place.id,slot}) ? [{location:place.id,slot}] : [];
    } catch { return []; }
  }));
}
function validateSlot(state,player,place,slot,data) {
  requireRule(Number.isInteger(slot) && place.slots?.[slot]?.includes(data.type),'SLOT');
  const existing=state.buildings.find(t=>t.location===place.id && t.slot===slot);
  if(existing) {
    requireRule(tileData(existing).type===data.type && tileData(existing).level<data.level,'OVERBUILD');
    if(existing.owner!==player.id) requireRule(['coal','iron'].includes(data.type) && state.markets[data.type]===0 && !state.buildings.some(t=>tileData(t).type===data.type && t.resources>0),'OVERBUILD');
  } else requireRule(!place.slots.some((types,i)=>types.length===1 && types[0]===data.type && !state.buildings.some(t=>t.location===place.id && t.slot===i)) || place.slots[slot].length===1,'SLOT_PRIORITY');
  requireRule(state.era!=='canal' || !state.buildings.some(t=>t.owner===player.id && t.location===place.id && t!==existing),'CITY_LIMIT');
}
function resolveAction(state,id,action) {
  requireRule(state.boardVersion===BOARD_VERSION,'BOARD_VERSION');
  requireRule(state.phase==='turn' && actorId(state)===id,'TURN');
  requireRule(typeof action.type==='string' && action.type.startsWith('fogport_'),'ACTION');
  const player=own(state,id); const kind=action.type.slice(8);
  requireRule(['build','network','develop','sell','loan','scout','pass'].includes(kind),'ACTION');
  requireRule(Array.isArray(action.resources??[]) && (action.resources??[]).length<=100 && (action.resources??[]).every(v=>typeof v==='string'),'RESOURCE');
  const before={money:player.money,income:player.income,vp:player.vp};
  const context={ values:action.resources??[], index:0, used:[],plan:[] };
  if(kind==='scout') requireRule(!player.hand.some(c=>c.kind.startsWith('wild_')) && state.wilds.location>0 && state.wilds.industry>0,'SCOUT');
  const cards=discardCards(state,player,kind==='scout' ? action.cards : [action.card],kind==='scout' ? 3 : 1);
  const changed=[];
  if(kind==='build') {
    const place=PLACE_BY_ID[action.location]; requireRule(place?.slots && Array.isArray(place.slots),'LOCATION');
    const data=takeInventory(player,action.industry); requireRule(data[state.era],'ERA');
    requireRule(validBuildCard(state,player,cards[0],place.id,data.type),'BUILD_CARD');
    validateSlot(state,player,place,action.slot,data);
    state.buildings=state.buildings.filter(t=>t.location!==place.id || t.slot!==action.slot);
    const tile={id:`b${state.nextBuilding++}`,tileId:data.id,owner:id,location:place.id,slot:action.slot,flipped:false,resources:0};
    state.buildings.push(tile); pay(player,data.cost);
    for(let n=0;n<data.coal;n++) consume(state,player,'coal',[place.id],context);
    for(let n=0;n<data.iron;n++) consume(state,player,'iron',[place.id],context);
    tile.resources=data.type==='beer' ? (state.era==='canal' ? 1 : 2) : data.output;
    if(['coal','iron'].includes(data.type) && (data.type==='iron' || PORTS.some(port=>canReach(state,[place.id],port.id)))) {
      const prices=MARKET_PRICES[data.type];
      while(tile.resources && state.markets[data.type]<prices.length) {
        const price=prices[prices.length-1-state.markets[data.type]]; tile.resources--; state.markets[data.type]++; player.money+=price;
      }
      if(!tile.resources) flip(state,tile);
    }
    changed.push(tile.id);
  }
  if(kind==='network') {
    const selected=action.links;
    requireRule(Array.isArray(selected) && selected.length>=1 && selected.length<=(state.era==='canal' ? 1 : 2) && new Set(selected).size===selected.length,'LINK');
    requireRule(state.links.filter(l=>l.owner===id).length+selected.length<=14,'LINK_SUPPLY');
    pay(player,state.era==='canal' ? 3 : selected.length===2 ? 15 : 5);
    for(const linkId of selected) {
      const link=LINK_BY_ID[linkId]; requireRule(link?.[state.era] && !state.links.some(l=>l.id===linkId),'LINK');
      const area=network(state,id); requireRule(!area.size || link.nodes.some(node=>area.has(node)),'NETWORK');
      state.links.push({id:linkId,owner:id});
      if(state.era==='rail') consume(state,player,'coal',link.nodes,context);
    }
    if(selected.length===2) consume(state,player,'beer',LINK_BY_ID[selected[1]].nodes,context);
    changed.push(...selected);
  }
  if(kind==='develop') {
    requireRule(Array.isArray(action.industries) && action.industries.length>=1 && action.industries.length<=2,'DEVELOP');
    for(const type of action.industries) { const data=takeInventory(player,type,true); consume(state,player,'iron',[],context); changed.push(data.id); }
  }
  if(kind==='sell') {
    requireRule(Array.isArray(action.sales) && action.sales.length>=1 && action.sales.length<=45,'SELL');
    for(const sale of action.sales) {
      requireRule(sale && typeof sale==='object' && !Array.isArray(sale),'SELL');
      const tile=state.buildings.find(t=>t.id===sale.building); const merchant=state.merchants.find(m=>m.id===sale.merchant);
      requireRule(tile && tile.owner===id && !tile.flipped && ['cotton','goods','pottery'].includes(tileData(tile).type),'SELL');
      requireRule(merchant?.buys.includes(tileData(tile).type) && canReach(state,[tile.location],merchant.location),'MERCHANT');
      let bonus=false;
      for(let n=0;n<tileData(tile).beer;n++) if(consume(state,player,'beer',[tile.location],context,merchant.id)===`m:${merchant.id}`) bonus=true;
      flip(state,tile);
      if(bonus) {
        const port=PLACE_BY_ID[merchant.location];
        if(port.bonus==='money') player.money+=port.amount;
        if(port.bonus==='income') advanceIncome(player,port.amount);
        if(port.bonus==='vp') player.vp+=port.amount;
        if(port.bonus==='develop') {
          const choices=INDUSTRIES.filter(type=>TILE_BY_ID[player.inventory[type][0]]?.develop);
          if(choices.length) { requireRule(choices.includes(sale.bonus),'CHOOSE_BONUS',{choices,sale:action.sales.indexOf(sale),selected:[...context.used]}); takeInventory(player,sale.bonus,true); }
        }
      }
      changed.push(tile.id);
    }
  }
  if(kind==='loan') { const level=incomeLevel(player.income)-3; requireRule(level>=-10,'LOAN'); player.income=topIncomePosition(level); player.money+=30; }
  if(kind==='scout') for(const type of ['location','industry']) { state.wilds[type]--; player.hand.push({id:`w-${player.seat}-${type}`,kind:`wild_${type}`}); }
  requireRule(context.values.length<=context.index,'RESOURCE');
  return { kind, cards, changed, targets:state.buildings.filter(tile=>changed.includes(tile.id)).map(tile=>({...tile})), resources:context.used,
    resourceUsage:context.plan,routes:kind==='network' ? action.links : [], removed:kind==='develop' ? changed : [], delta:{money:player.money-before.money,income:player.income-before.income,vp:player.vp-before.vp} };
}
export function previewAction(source,id,action) {
  const state=copyState(source); const before=own(state,id);
  const original=before ? {money:before.money,income:before.income,vp:before.vp} : null;
  try {
    const outcome=resolveAction(state,id,action); const player=own(state,id);
    return { valid:true, resources:outcome.resources,resourceUsage:outcome.resourceUsage, delta:{ money:player.money-original.money, income:player.income-original.income, vp:player.vp-original.vp }, state };
  } catch(error) {
    if(!(error instanceof FogportError)) throw error;
    return {valid:false,error:error.code,detail:error.detail,state};
  }
}
// Equivalent-cost free sources need no user choice to decide target availability.
export function actionAvailable(state,id,action) {
  const candidate={...action,resources:[]};
  for(let step=0;step<100;step++) {
    const preview=previewAction(state,id,candidate);
    if(preview.valid) return true;
    if(preview.error==='CHOOSE_RESOURCE') candidate.resources=[...preview.detail.selected,preview.detail.choices[0].id];
    else return false;
  }
  return false;
}
function replenish(state,player) { while(player.hand.length<8 && state.deck.length) player.hand.push(state.deck.shift()); }
function isEraEnd(state) { return !state.deck.length && state.players.every(p=>!p.hand.length); }
function rank(state) {
  const players=[...state.players].sort((a,b)=>b.vp-a.vp || b.income-a.income || b.money-a.money);
  const best=players[0]; return players.filter(p=>p.vp===best.vp && p.income===best.income && p.money===best.money).map(p=>p.id);
}
function scoreEra(state,now) {
  const rows=state.players.map(p=>({playerId:p.id,links:0,industries:0,bonus:0}));
  const nodeValue=node=>state.buildings.filter(t=>t.location===node && t.flipped).reduce((sum,t)=>sum+tileData(t).link,0)+(PORTS.some(p=>p.id===node) ? 2 : 0);
  for(const built of state.links) rows.find(row=>row.playerId===built.owner).links+=LINK_BY_ID[built.id].nodes.reduce((sum,node)=>sum+nodeValue(node),0);
  for(const tile of state.buildings) if(tile.flipped) rows.find(row=>row.playerId===tile.owner).industries+=tileData(tile).vp;
  if(state.mode==='introductory') for(const p of state.players) {
    rows.find(row=>row.playerId===p.id).bonus=Math.min(15,Math.floor(p.money/4))+incomeLevel(p.income)+state.buildings.filter(t=>t.owner===p.id && tileData(t).level>=2).reduce((sum,t)=>sum+tileData(t).vp,0);
  }
  for(const row of rows) own(state,row.playerId).vp+=row.links+row.industries+row.bonus;
  state.scoring.push({era:state.era,rows}); event(state,{type:'score',rows},now); state.links=[];
}
function finishRound(state,rng,now) {
  if(isEraEnd(state)) {
    scoreEra(state,now);
    if(state.era==='rail' || state.mode==='introductory') {
      state.phase='finished'; state.result={winners:rank(state),reason:'completed'}; event(state,{type:'finish',...state.result},now); return;
    }
    state.buildings=state.buildings.filter(t=>tileData(t).level>=2);
    for(const merchant of state.merchants) merchant.beer=merchant.buys.length ? 1 : 0;
    state.deck=shuffle(state.players.flatMap(p=>[...p.discard,...(p.hiddenDiscard ? [p.hiddenDiscard] : [])]),rng);
    for(const p of state.players) { p.discard=[]; p.hiddenDiscard=null; replenish(state,p); }
    state.era='rail'; state.eraRound=1; event(state,{type:'era'},now);
  } else state.eraRound++;
  state.phase='turn'; state.turnIndex=0; state.actionsLeft=Math.min(2,own(state,state.order[0]).hand.length);
}
function settleIncomes(state,rng,now) {
  while(state.settlement.queue.length) {
    const id=state.settlement.queue[0]; const player=own(state,id); const income=incomeLevel(player.income);
    if(income>=0 || player.money>=-income) { player.money+=income; event(state,{type:'income',playerId:id,amount:income},now); state.settlement.queue.shift(); continue; }
    if(!state.buildings.some(t=>t.owner===id)) {
      const shortfall=-income-player.money,loss=Math.min(player.vp,shortfall); player.vp-=loss; player.money=0; state.settlement.queue.shift();
      event(state,{type:'shortfall',playerId:id,loss,shortfall},now); continue;
    }
    state.phase='liquidation'; state.settlement.playerId=id; state.settlement.debt=-income; return;
  }
  state.settlement=null; finishRound(state,rng,now);
}
function completeTurn(state,rng,now) {
  replenish(state,own(state,state.order[state.turnIndex])); state.turnIndex++;
  if(state.turnIndex<state.order.length) {
    state.actionsLeft=Math.min(state.era==='canal' && state.eraRound===1 ? 1 : 2,own(state,state.order[state.turnIndex]).hand.length); return;
  }
  state.order.sort((a,b)=>own(state,a).spent-own(state,b).spent);
  event(state,{type:'order',order:[...state.order],spending:state.players.map(p=>({playerId:p.id,spent:p.spent}))},now);
  for(const player of state.players) player.spent=0;
  if(isEraEnd(state) && (state.era==='rail' || state.mode==='introductory')) { finishRound(state,rng,now); return; }
  state.settlement={queue:[...state.order],playerId:null,debt:0}; settleIncomes(state,rng,now);
}
export function applyGameAction(source,id,action,rng,now=Date.now()) {
  requireRule(source.boardVersion===BOARD_VERSION,'BOARD_VERSION');
  const state=copyState(source);
  if(action.type==='fogport_liquidate') {
    requireRule(state.phase==='liquidation' && actorId(state)===id,'TURN');
    const tile=state.buildings.find(t=>t.id===action.building && t.owner===id); requireRule(tile,'LIQUIDATE');
    const player=own(state,id); requireRule(player.money<state.settlement.debt,'LIQUIDATE');
    const amount=Math.floor(tileData(tile).cost/2); state.buildings=state.buildings.filter(t=>t.id!==tile.id); player.money+=amount;
    event(state,{type:'liquidate',playerId:id,building:tile.id,targets:[{...tile}],amount},now); settleIncomes(state,rng,now);
  } else {
    const outcome=resolveAction(state,id,action); event(state,{type:outcome.kind,playerId:id,...outcome},now); state.actionsLeft--;
    if(!state.actionsLeft) completeTurn(state,rng,now);
  }
  return state;
}
export function publicView(source,id) {
  const state=copyState(source);
  requireRule(own(state,id),'PLAYERS');
  state.deckCount=state.deck.length; delete state.deck;
  for(const player of state.players) { player.handCount=player.hand.length; if(player.id!==id) delete player.hand; delete player.hiddenDiscard; }
  state.actorId=actorId(state); state.selfId=id;
  if(state.settlement) state.settlement={playerId:state.settlement.playerId,...(state.actorId===id ? {debt:state.settlement.debt} : {})};
  return state;
}
export function abortGame(source,now=Date.now()) {
  const state=copyState(source); state.phase='finished'; state.settlement=null; state.result={winners:[],reason:'aborted'}; event(state,{type:'finish',...state.result},now); return state;
}
