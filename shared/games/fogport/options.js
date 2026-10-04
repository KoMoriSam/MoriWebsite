import { PLACES, LINKS, INDUSTRIES, TILE_BY_ID, BOARD_VERSION } from './data.js';
import { actorId, buildingTargets, previewAction, tileData, canReach } from './engine.js';

export const ACTIONS = ['build','network','develop','sell','loan','scout','pass'];
export function liquidationOptions(state,id) {
  if(state.boardVersion!==BOARD_VERSION || state.phase!=='liquidation' || actorId(state)!==id) return [];
  const remaining=Math.max(0,state.settlement.debt-state.players.find(p=>p.id===id).money);
  if(!remaining) return [];
  return state.buildings.filter(b=>b.owner===id).map(b=>{
    const cost=tileData(b).cost,amount=Math.floor(cost/2);
    return {type:'fogport_liquidate',building:b.id,cost,amount,remaining:Math.max(0,remaining-amount)};
  });
}
const copy = value => JSON.parse(JSON.stringify(value));
const cache = new WeakMap();
function entriesFor(state) {
  const stamp=JSON.stringify([state.boardVersion,state.phase,state.era,state.order,state.turnIndex,state.actionsLeft,state.markets,state.links,state.buildings,state.merchants,state.wilds,state.players.map(p=>[p.id,p.money,p.income,p.inventory,p.hand])]);
  let saved=cache.get(state);
  if(!saved || saved.stamp!==stamp) {saved={stamp,entries:new Map()};cache.set(state,saved);}
  return saved.entries;
}

// Availability includes the whole action, including ordered resources and merchant rewards.
// Recommendations never commit an action; the player can change any remaining legal choice.
export function completeAction(state, id, action) {
  const candidate = copy(action),deadEnds=new Map();
  function visit(command, depth = 0) {
    const preview = previewAction(state,id,command);
    if (preview.valid) return { ...preview, command: { ...command, resources: preview.resources } };
    if (depth >= 145) return preview;
    const key=JSON.stringify([preview.error,preview.detail?.index,preview.detail?.sale,preview.state.markets,preview.state.buildings.map(b=>[b.id,b.resources,b.flipped]),preview.state.players.map(p=>[p.id,p.money,p.income,p.inventory]),command.sales?.map(s=>s.bonus),command.resources?.slice(preview.detail?.index ?? preview.detail?.selected?.length ?? 0)]);
    if(deadEnds.has(key)) return deadEnds.get(key);
    let failed=preview;
    if (preview.error === 'CHOOSE_RESOURCE') {
      const choices = [...preview.detail.choices].sort((a,b) => Number(b.id.startsWith('m:'))-Number(a.id.startsWith('m:')) || Number(b.owner===id)-Number(a.owner===id));
      for (const choice of choices) {
        const next = visit({ ...command, resources: [...preview.detail.selected,choice.id] },depth+1);
        if (next.valid) return next;
        failed=next;
      }
    }
    if (preview.error === 'CHOOSE_BONUS') {
      for (const type of preview.detail.choices) {
        const next = copy(command);
        next.sales[preview.detail.sale].bonus = type;
        const result = visit(next,depth+1);
        if (result.valid) return result;
        failed=result;
      }
    }
    deadEnds.set(key,failed);
    return failed;
  }
  return visit(candidate);
}
const matches = (command,filter) => (!filter.card || command.card===filter.card || command.cards?.includes(filter.card)) && (!filter.industry || command.industry===filter.industry || command.industries?.[0]===filter.industry) && (!filter.location || command.location===filter.location) && (filter.slot===undefined || command.slot===filter.slot) && (!filter.link || command.links?.[0]===filter.link) && (!filter.building || command.sales?.[0].building===filter.building) && (!filter.merchant || command.sales?.[0].merchant===filter.merchant);
const handOrder = hand => [...hand].sort((a,b) => Number(a.kind.startsWith('wild_'))-Number(b.kind.startsWith('wild_')));
export function legalActions(state,id,kind,filter = {}) {
  if (state.boardVersion!==BOARD_VERSION || state.phase!=='turn' || actorId(state)!==id) return [];
  const entries=entriesFor(state);
  const key=JSON.stringify([id,kind,filter]);
  if (entries.has(key)) return entries.get(key);
  const player=state.players.find(p=>p.id===id), options=[];
  const accept = command => {
    if(filter.merchantIds && !filter.merchantIds.includes(command.sales?.[0].merchant)) return;
    if (!matches(command,filter)) return;
    const result=completeAction(state,id,command);
    if (result.valid) options.push(result.command);
  };
  for (const card of handOrder(player.hand)) {
    if (filter.card && card.id!==filter.card && kind!=='scout') continue;
    const base={type:`fogport_${kind}`,card:card.id,resources:[]};
    if (kind==='build') for (const industry of INDUSTRIES) {
      if (filter.industry && industry!==filter.industry) continue;
      for (const target of buildingTargets(state,id,card.id,industry)) accept({...base,industry,...target});
    }
    if (kind==='network') for (const link of LINKS) {
      if (link[state.era] && !state.links.some(b=>b.id===link.id)) accept({...base,links:[link.id]});
    }
    if (kind==='develop') for (const industry of INDUSTRIES) accept({...base,industries:[industry]});
    if (kind==='sell') for (const sale of salePairs(state,id)) accept({...base,sales:[sale]});
    if (kind==='loan' || kind==='pass') accept(base);
  }
  if (kind==='scout') {
    const hand=handOrder(player.hand);
    for (let a=0;a<hand.length;a++) for(let b=a+1;b<hand.length;b++) for(let c=b+1;c<hand.length;c++) accept({type:'fogport_scout',cards:[hand[a].id,hand[b].id,hand[c].id],resources:[]});
  }
  entries.set(key,options);
  return options;
}
export function salePairs(state,id) {
  return state.buildings.filter(b=>b.owner===id && !b.flipped && ['cotton','goods','pottery'].includes(tileData(b).type))
    .flatMap(b=>state.merchants.filter(m=>m.buys.includes(tileData(b).type) && canReach(state,[b.location],m.location)).map(m=>({building:b.id,merchant:m.id,bonus:''})));
}
export function extensions(state,id,command) {
  const entries=entriesFor(state),key=JSON.stringify(['extensions',id,command]);
  if(entries.has(key)) return entries.get(key);
  const kind=command.type.slice(8), candidates=[];
  if (kind==='network' && state.era==='rail' && command.links.length===1) for(const link of LINKS) candidates.push({...command,links:[...command.links,link.id],resources:[]});
  if (kind==='develop' && command.industries.length===1) for(const industry of INDUSTRIES) candidates.push({...command,industries:[...command.industries,industry],resources:[]});
  if (kind==='sell') for(const sale of salePairs(state,id)) candidates.push({...command,sales:[...command.sales,sale],resources:[]});
  const options=candidates.map(c=>completeAction(state,id,c)).filter(r=>r.valid).map(r=>r.command);
  entries.set(key,options);return options;
}
export function resourceSteps(state,id,command) {
  const steps=[];
  let prefix=[];
  for (let n=0;n<145;n++) {
    const preview=previewAction(state,id,{...command,resources:prefix});
    if (preview.error!=='CHOOSE_RESOURCE') break;
    const {index,selected,resource}=preview.detail;
    const choices=preview.detail.choices.filter(choice=>completeAction(state,id,{...command,resources:[...selected,choice.id]}).valid);
    const source=choices.find(c=>c.id===command.resources?.[index])?.id ?? choices[0]?.id;
    if (!source) break;
    steps.push({index,resource,choices,source,prefix:selected,state:preview.state});
    prefix=[...selected,source];
  }
  return steps;
}
export function bonusChoices(state,id,command,index) {
  const candidate=copy(command); candidate.sales[index].bonus='';
  const preview=previewAction(state,id,candidate);
  if (preview.error!=='CHOOSE_BONUS' || preview.detail.sale!==index) return [];
  return preview.detail.choices.filter(type=>{const next=copy(candidate);next.sales[index].bonus=type;return completeAction(state,id,next).valid;});
}
export function unavailableReason(state,id,kind,filter = {}) {
  if(state.boardVersion!==BOARD_VERSION) return 'BOARD_VERSION';
  if (state.phase!=='turn' || actorId(state)!==id) return 'TURN';
  const player=state.players.find(p=>p.id===id), card=player.hand.find(c=>c.id===filter.card) ?? handOrder(player.hand)[0];
  if (!card) return 'CARD';
  const base={type:`fogport_${kind}`,card:card.id,resources:[]};
  if(kind==='loan' || kind==='pass') return completeAction(state,id,base).error ?? 'ACTION';
  if(kind==='scout') return player.hand.length<3 ? 'CARD' : 'SCOUT';
  if(kind==='network') {
    if(state.links.filter(l=>l.owner===id).length>=14) return 'LINK_SUPPLY';
    if(player.money<(state.era==='canal' ? 3 : 5)) return 'MONEY';
    if(filter.link) return completeAction(state,id,{...base,links:[filter.link]}).error ?? 'NETWORK';
    return state.era==='rail' ? 'RESOURCE' : 'NETWORK';
  }
  if(kind==='develop') {
    if(filter.industry && !player.inventory[filter.industry]?.length) return 'INVENTORY';
    const types=filter.industry ? [filter.industry] : INDUSTRIES;
    const type=types.find(t=>TILE_BY_ID[player.inventory[t][0]]?.develop);
    return type ? completeAction(state,id,{...base,industries:[type]}).error ?? 'DEVELOP' : 'DEVELOP';
  }
  if(kind==='sell') {
    const building=state.buildings.find(b=>b.id===filter.building);
    if(filter.building && (!building || building.owner!==id || building.flipped || !['cotton','goods','pottery'].includes(tileData(building).type))) return 'SELL';
    const pairs=salePairs(state,id).filter(s=>(!filter.building || s.building===filter.building) && (!filter.merchant || s.merchant===filter.merchant) && (!filter.merchantIds || filter.merchantIds.includes(s.merchant)));
    return pairs.length ? completeAction(state,id,{...base,sales:[pairs[0]]}).error ?? 'SELL' : 'MERCHANT';
  }
  if(filter.location) {
    const place=PLACES.find(p=>p.id===filter.location);
    if(!Array.isArray(place?.slots)) return 'LOCATION';
    if(filter.slot!==undefined && (!Array.isArray(place.slots[filter.slot]) || filter.industry && !place.slots[filter.slot].includes(filter.industry))) return 'SLOT';
  }
  const types=(filter.industry ? [filter.industry] : INDUSTRIES).filter(t=>player.inventory[t]?.length);
  if(!types.length) return 'INVENTORY';
  if(types.every(t=>!TILE_BY_ID[player.inventory[t][0]][state.era])) return 'ERA';
  const failures=[];
  for(const type of types) for(const place of PLACES) {
    if(filter.location && filter.location!==place.id || !Array.isArray(place.slots)) continue;
    place.slots.forEach((allowed,slot)=>{
      if(!allowed.includes(type) || filter.slot!==undefined && filter.slot!==slot) return;
      for(const c of filter.card ? [card] : player.hand) failures.push(completeAction(state,id,{...base,card:c.id,industry:type,location:place.id,slot}).error);
    });
  }
  return ['RESOURCE','MONEY','CITY_LIMIT','OVERBUILD','SLOT_PRIORITY'].find(code=>failures.includes(code)) ?? (failures.includes('BUILD_CARD') ? filter.card ? 'BUILD_CARD' : 'NO_CARD' : 'NO_TARGET');
}
