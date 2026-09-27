import { avalon } from '../avalon/rules.js';
import { ensure } from './utils.js';

// Adapters own rules and private views; the room service owns seats and lifecycle.
const games = new Map([[avalon.id, avalon]]);
export function getGame(gameType) {
  const definition = games.get(gameType);
  ensure(definition, 'GAME_TYPE');
  return definition;
}
