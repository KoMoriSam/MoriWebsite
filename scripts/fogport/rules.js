import { createGame, applyGameAction, publicView, abortGame, normalizeConfig, FogportError } from '../../shared/games/fogport/engine.js';
import { GameError, randomInt } from '../games/utils.js';
const checked = operation => { try { return operation(); } catch(error) { if(error instanceof FogportError) throw new GameError(error.code); throw error; } };
export const fogport = {
  id:'fogport', minPlayers:2, maxPlayers:4,
  normalizeConfig: config => checked(()=>normalizeConfig(config)),
  create: (players,rng,config) => checked(()=>createGame(players,rng,config)),
  apply(state,players,id,action,now) { return checked(()=>{ const next=applyGameAction(state,id,action,randomInt,now); return {state:next,stageChanged:true,finished:next.phase==='finished'}; }); },
  view: (state,players,id) => checked(()=>publicView(state,id)),
  abort: state => abortGame(state),
};
