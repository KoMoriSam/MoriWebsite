import { computed, readonly, ref, watch } from 'vue';
import { ACTIONS, legalActions, extensions, completeAction, liquidationOptions } from '../../../../shared/games/fogport/options.js';

const INPUTS={build:['card','industry'],network:['card','link'],develop:['card','industry'],sell:['card','building']};
const TARGETS={build:['slot','place'],network:['link'],develop:['develop'],sell:['building','merchant','place'],liquidate:['building']};
const idle=()=>({kind:'idle',phase:'idle',selection:null,menu:null,draft:null,hover:null,dragTarget:null});
const filterFor=(kind,payload)=>payload?.kind==='card' ? {card:payload.id} : payload?.kind==='industry' && INPUTS[kind]?.includes('industry') ? {industry:payload.industry} : payload?.kind==='building' && kind==='sell' ? {building:payload.id} : {};

// One context owns the action, object selection, menu/editor and drag lifetime.
// Map clicks and drops consume the same fully simulated legal commands.
export function useActionMode(game,selfId) {
  const state=ref(idle()),context=readonly(state),pending=ref(null);
  const submitting=computed(()=>pending.value!==null);
  const mode=computed(()=>TARGETS[state.value.kind] ? state.value : null);
  const selected=computed(()=>state.value.selection),menu=computed(()=>state.value.menu),draft=computed(()=>state.value.draft);
  const hoverTarget=computed(()=>state.value.hover),dragTarget=computed(()=>state.value.dragTarget);
  const activeKind=computed(()=>state.value.kind==='idle' ? '' : state.value.kind);
  const commands=computed(()=>{
    const m=mode.value;if(!m || submitting.value) return [];
    if(m.kind==='liquidate') return liquidationOptions(game.value,selfId.value);
    let rows=m.adding && m.command ? extensions(game.value,selfId.value,m.command) : legalActions(game.value,selfId.value,m.kind,m.filter);
    if(m.building) rows=rows.filter(c=>c.sales.at(-1).building===m.building);
    return rows;
  });
  const targets=computed(()=>{
    const m=mode.value;if(!m) return [];
    if(m.kind==='liquidate') return commands.value.map(c=>'building:'+c.building);
    return [...new Set(commands.value.flatMap(c=>m.kind==='build' ? [`slot:${c.location}:${c.slot}`,`place:${c.location}`] : m.kind==='network' ? [`link:${c.links.at(-1)}`] : m.kind==='sell' ? m.building ? [`merchant:${c.sales.at(-1).merchant}`,`place:${game.value.merchants.find(v=>v.id===c.sales.at(-1).merchant).location}`] : [`building:${c.sales.at(-1).building}`] : []))];
  });
  const cardChoices=computed(()=>INPUTS[mode.value?.kind] ? legalActions(game.value,selfId.value,mode.value.kind,{...mode.value.filter,card:undefined}) : []);
  const industryChoices=computed(()=>!INPUTS[mode.value?.kind] ? [] : mode.value.adding ? commands.value : legalActions(game.value,selfId.value,mode.value.kind,{...mode.value.filter,industry:undefined}));
  const cards=computed(()=>[...new Set(cardChoices.value.map(c=>c.card))]);
  const industries=computed(()=>[...new Set(industryChoices.value.map(c=>mode.value.kind==='develop' ? c.industries.at(-1) : c.industry).filter(Boolean))]);
  const selectedTargets=computed(()=>{
    const m=mode.value,c=m?.command;if(!c) return m?.building ? [`building:${m.building}`] : [];
    if(m.kind==='liquidate') return ['building:'+c.building];
    return c.location ? [`slot:${c.location}:${c.slot}`,`place:${c.location}`] : c.links ? c.links.map(id=>`link:${id}`) : c.sales ? [...c.sales.flatMap(s=>[`building:${s.building}`,`merchant:${s.merchant}`]),...(m.building ? ['building:'+m.building] : [])] : [];
  });
  function reset() {state.value=liquidationOptions(game.value,selfId.value).length ? {...idle(),kind:'liquidate',phase:'select',command:null,filter:{}} : idle();}
  function begin(kind,filter={},selection=null) {
    if(submitting.value || state.value.phase==='drag') return false;
    if(state.value.kind==='liquidate') return false;
    reset();if(!ACTIONS.includes(kind)) return false;
    const rows=legalActions(game.value,selfId.value,kind,filter);if(!rows.length) return false;
    state.value={...idle(),kind,phase:INPUTS[kind] ? 'select' : 'editor',selection,filter:{...filter},command:null,adding:false,building:null,origin:'click'};
    if(!INPUTS[kind]) state.value.draft={kind,command:rows[0],filter:{...filter}};
    else if(kind==='sell' && filter.building) chooseTarget({kind:'building',id:filter.building});
    return true;
  }
  function inspect(selection,title,options) {if(submitting.value || state.value.phase==='drag' || state.value.kind==='liquidate') return false;state.value={...idle(),kind:'inspect',phase:'menu',selection,menu:{title,options}};return true;}
  function acceptsPayload(payload) {return !submitting.value && state.value.phase!=='drag' && !!payload && (state.value.kind==='idle' || INPUTS[state.value.kind]?.includes(payload.kind)===true);}
  function acceptsTarget(target) {
    const m=mode.value;if(!m || !target || !TARGETS[m.kind].includes(target.kind)) return false;
    return m.kind!=='sell' || (m.building ? ['merchant','place'].includes(target.kind) : target.kind==='building');
  }
  function replace(command) {
    const m=mode.value;if(submitting.value || !m || command.type!==`fogport_${m.kind}`) return false;
    const result=completeAction(game.value,selfId.value,command);if(!result.valid) return false;
    state.value={...m,command:result.command,phase:m.origin==='drag' ? 'drag' : 'review',adding:false,building:null,hover:null,dragTarget:null};return true;
  }
  function chooseIndustry(industry) {
    const m=mode.value;if(submitting.value || state.value.phase==='drag' || !m || !INPUTS[m.kind]?.includes('industry')) return false;
    const row=industryChoices.value.find(c=>m.kind==='develop' ? c.industries.at(-1)===industry : c.industry===industry);if(!row) return false;
    if(m.kind==='develop') {if(!replace(row)) return false;state.value.selection={kind:'industry',industry};return true;}
    state.value={...m,filter:{...m.filter,industry},selection:{kind:'industry',industry},command:null,phase:'select',hover:null,dragTarget:null};return true;
  }
  function chooseCard(card) {
    const m=mode.value;if(submitting.value || state.value.phase==='drag' || !m || !cards.value.includes(card)) return false;
    if(m.command && replace({...m.command,card,resources:[]})) {state.value.filter={...m.filter,card};state.value.selection={kind:'card',id:card};return true;}
    state.value={...m,filter:{...m.filter,card},selection:{kind:'card',id:card},command:null,phase:'select',adding:false,hover:null,dragTarget:null};return true;
  }
  function matching(target) {
    const m=mode.value;if(!acceptsTarget(target)) return [];
    if(m.kind==='liquidate') return commands.value.filter(c=>c.building===target.id);
    return commands.value.filter(c=>m.kind==='build' ? target.kind==='slot' ? c.location===target.location && c.slot===target.slot : c.location===target.id : m.kind==='network' ? c.links.at(-1)===target.id : m.kind==='sell' ? target.kind==='building' ? c.sales.at(-1).building===target.id : target.kind==='merchant' ? c.sales.at(-1).merchant===target.id : game.value.merchants.find(v=>v.id===c.sales.at(-1).merchant).location===target.id : m.kind==='develop' && state.value.selection?.industry===c.industries.at(-1));
  }
  function chooseTarget(target) {
    if(submitting.value) return false;
    const rows=matching(target);if(!rows.length) return false;
    if(mode.value.kind==='liquidate') {state.value={...state.value,command:rows[0],selection:target};return true;}
    if(mode.value.kind==='sell' && target.kind==='building') {
      state.value={...state.value,building:target.id,selection:{kind:'building',id:target.id},hover:null,dragTarget:null};
      if(new Set(rows.map(c=>c.sales.at(-1).merchant)).size===1) return replace(rows[0]);
      return true;
    }
    return replace(rows[0]);
  }
  function beginDrag(payload) {
    if(!acceptsPayload(payload)) return false;
    const kind=mode.value?.kind ?? ({card:'build',industry:'build',building:'sell',link:'network'})[payload.kind];
    if(!kind) return false;
    const m=mode.value,filter={...(m?.filter??{}),...filterFor(kind,payload)};
    // Extending a compound action keeps its prefix; it never starts a different action.
    if(m?.adding) {
      state.value={...m,origin:'drag',phase:'drag',selection:payload,hover:null,dragTarget:null};
      if(payload.kind==='industry' && !commands.value.some(c=>c.industries?.at(-1)===payload.industry)) {reset();return false;}
      return true;
    }
    if(!begin(kind,filter,payload)) return false;
    state.value={...state.value,origin:'drag',phase:'drag',...(payload.kind==='building' ? {building:payload.id,command:null} : {})};return true;
  }
  function finishDrag(accepted) {
    if(state.value.origin!=='drag') return;
    if(!accepted) {reset();return;}
    state.value={...state.value,origin:'click',phase:state.value.command ? 'review' : 'select',hover:null,dragTarget:null};
  }
  function beginSubmit(type) {
    if(submitting.value || state.value.phase==='drag' || type!==`fogport_${state.value.kind}` || !(state.value.command || state.value.draft)) return null;
    state.value={...state.value,phase:'submitting',hover:null,dragTarget:null};pending.value=state.value;return state.value;
  }
  function endSubmit(token,saved) {
    if(pending.value!==token) return;
    pending.value=null;if(state.value!==token) return;
    if(state.value.kind==='liquidate') {reset();return;}
    if(saved) reset();else state.value={...state.value,phase:state.value.command ? 'review' : 'editor'};
  }
  function hover(key) {state.value.hover=key && (state.value.kind==='idle' || targets.value.includes(key) || selectedTargets.value.includes(key)) ? key : null;}
  function dragOver(target) {if(state.value.origin!=='drag') return;state.value.dragTarget=target;hover(target ? target.kind==='slot' ? `slot:${target.location}:${target.slot}` : `${target.kind}:${target.id}` : null);}
  function add() {const m=mode.value;if(submitting.value || m?.phase==='drag' || !m?.command || !extensions(game.value,selfId.value,m.command).length) return false;state.value={...m,adding:true,phase:'select',building:null,selection:null,hover:null,dragTarget:null};return true;}
  function back() {if(mode.value?.adding) {state.value={...state.value,adding:false,phase:'review',building:null,selection:null,hover:null,dragTarget:null};return;}reset();}
  watch(()=>[game.value,selfId.value],reset,{flush:'sync',immediate:true});
  return {context,mode,activeKind,selected,menu,draft,hoverTarget,dragTarget,commands,targets,cards,industries,selectedTargets,submitting,begin,inspect,replace,chooseIndustry,chooseCard,matching,chooseTarget,acceptsPayload,acceptsTarget,beginDrag,finishDrag,beginSubmit,endSubmit,hover,dragOver,add,back,reset};
}

