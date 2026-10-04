import {BOARD_ROADS, MAP_PIXEL_POINTS, MAP_SIZE, MAP_ART_SIZE} from './board-data.js';
export {BOARD_VERSION} from './board-data.js';
// Mechanical data only. Rendering and names are original; IDs never depend on translations.
// Industry audit: original player mat BGG #5002996, production sample #4099880,
// and Roxley's rulebook (printed pp. 1, 5, 8, 10). Readings/conflicts are in PLAN.md.
export const RULES_VERSION = '2018.11.20';
export const INDUSTRIES = ['cotton', 'coal', 'iron', 'goods', 'pottery', 'beer'];
export const SYMBOLS = { cotton: '▥', coal: '◆', iron: '⚒', goods: '▣', pottery: '◇', beer: '◉' };
// level, copies, cash, coal, iron, beer to sell, VP, income spaces, link value, output,
// buildable eras (c/r/both), developable. Each copy remains a separate inventory tile.
const rows = {
  cotton: [[1,3,12,0,0,1,5,5,1,0,'c',1],[2,2,14,1,0,1,5,4,2,0,'b',1],[3,3,16,1,1,1,9,3,1,0,'b',1],[4,3,18,1,1,1,12,2,1,0,'b',1]],
  coal: [[1,1,5,0,0,0,1,4,2,2,'c',1],[2,2,7,0,0,0,2,7,1,3,'b',1],[3,2,8,0,1,0,3,6,1,4,'b',1],[4,2,10,0,1,0,4,5,1,5,'b',1]],
  iron: [[1,1,5,1,0,0,3,3,1,4,'c',1],[2,1,7,1,0,0,5,3,1,4,'b',1],[3,1,9,1,0,0,7,2,1,5,'b',1],[4,1,12,1,0,0,9,1,1,6,'b',1]],
  goods: [[1,1,8,1,0,1,3,5,2,0,'c',1],[2,2,10,0,1,1,5,1,1,0,'b',1],[3,1,12,2,0,0,4,4,0,0,'b',1],[4,1,8,0,1,1,3,6,1,0,'b',1],[5,2,16,1,0,2,8,2,2,0,'b',1],[6,1,20,0,0,1,7,6,1,0,'b',1],[7,1,16,1,1,0,9,4,0,0,'b',1],[8,2,20,0,2,1,11,1,1,0,'b',1]],
  pottery: [[1,1,17,0,1,1,10,5,1,0,'b',0],[2,1,0,1,0,1,1,1,1,0,'b',1],[3,1,22,2,0,2,11,5,1,0,'b',0],[4,1,0,1,0,1,1,1,1,0,'b',1],[5,1,24,2,0,2,20,5,1,0,'r',1]],
  beer: [[1,2,5,0,1,0,4,4,2,1,'c',1],[2,2,7,0,1,0,5,5,2,1,'b',1],[3,2,9,0,1,0,7,5,2,1,'b',1],[4,1,9,0,1,0,10,5,2,2,'r',1]],
};
export const TILES = Object.fromEntries(INDUSTRIES.map(type => [type, rows[type].flatMap(([level,copies,cost,coal,iron,beer,vp,income,link,output,era,develop]) => Array.from({ length: copies }, (_, copy) => ({ id: `${type}-${level}-${copy}`, type, level, cost, coal, iron, beer, vp, income, link, output, canal: era !== 'r', rail: era !== 'c', develop: !!develop })))]));
export const TILE_BY_ID = Object.fromEntries(Object.values(TILES).flat().map(tile => [tile.id, tile]));
// Original location correspondence is retained solely for source audits.
const locations = [
  ['Belper', [['cotton','goods'],['coal'],['pottery']],4,2],
  ['Birmingham', [['cotton','goods'],['goods'],['iron'],['goods']],2,3],
  ['Burton-on-Trent', [['goods','coal'],['beer']],2,2],
  ['Cannock', [['goods','coal'],['coal']],2,2],
  ['Coalbrookdale', [['iron','beer'],['iron'],['coal']],2,3],
  ['Coventry', [['pottery'],['goods','coal'],['iron','goods']],2,3],
  ['Derby', [['cotton','beer'],['cotton','goods'],['iron']],4,3],
  ['Dudley', [['coal'],['iron']],2,2],
  ['Kidderminster', [['cotton','coal'],['cotton']],2,2],
  ['Leek', [['cotton','goods'],['cotton','coal']],3,2],
  ['Nuneaton', [['goods','beer'],['cotton','coal']],2,1],
  ['Redditch', [['goods','coal'],['iron']],2,1],
  ['Stafford', [['goods','beer'],['pottery']],2,2],
  ['Stoke-on-Trent', [['cotton','goods'],['pottery','iron'],['goods']],3,3],
  ['Stone', [['cotton','beer'],['goods','coal']],3,2],
  ['Tamworth', [['cotton','coal'],['cotton','coal']],2,1],
  ['Uttoxeter', [['goods','beer'],['cotton','beer']],3,1],
  ['Walsall', [['iron','goods'],['goods','beer']],2,1],
  ['Wolverhampton', [['goods'],['goods','coal']],2,2],
  ['Worcester', [['cotton'],['cotton']],2,2],
];
export const CITIES = locations.map(([source,slots,minPlayers,copies], index) => ({ id: `d${index+1}`, number: index+1, source, slots, minPlayers, copies }));
export const FARMS = [{ id: 'f1', number: 1, slots: [['beer']] }, { id: 'f2', number: 2, slots: [['beer']] }];
export const PORTS = [
  { id: 'p1', number: 1, source: 'Shrewsbury', slots: 1, minPlayers: 2, bonus: 'vp', amount: 4 },
  { id: 'p2', number: 2, source: 'Gloucester', slots: 2, minPlayers: 2, bonus: 'develop', amount: 1 },
  { id: 'p3', number: 3, source: 'Oxford', slots: 2, minPlayers: 2, bonus: 'income', amount: 2 },
  { id: 'p4', number: 4, source: 'Warrington', slots: 2, minPlayers: 3, bonus: 'money', amount: 5 },
  { id: 'p5', number: 5, source: 'Nottingham', slots: 2, minPlayers: 4, bonus: 'vp', amount: 3 },
];
export const PLACES = [...CITIES, ...FARMS, ...PORTS];
for(const place of PLACES) [place.x,place.y]=MAP_PIXEL_POINTS[place.id].map(n=>n*MAP_SIZE/MAP_ART_SIZE);
export const PLACE_BY_ID = Object.fromEntries(PLACES.map(place => [place.id, place]));
// Corridors are mechanical data; geometry and current-game legality are separate.
export const LINKS=BOARD_ROADS.map(({id,nodes,scope,canal,rail,transport})=>({id,nodes,scope,canal,rail,transport}));
export const linkKind=(link,era)=>link.transport[era];
export const LINK_BY_ID = Object.fromEntries(LINKS.map(link => [link.id, link]));
export const MARKET_PRICES = { coal: Array.from({ length: 14 }, (_, i) => 1+Math.floor(i/2)), iron: Array.from({ length: 10 }, (_, i) => 1+Math.floor(i/2)) };
export const INCOME = Array.from({ length: 100 }, (_, i) => i <= 10 ? i-10 : i <= 30 ? Math.ceil((i-10)/2) : i <= 60 ? 10+Math.ceil((i-30)/3) : i <= 96 ? 20+Math.ceil((i-60)/4) : 30);
export const incomeLevel = position => INCOME[position];
export const topIncomePosition = level => INCOME.lastIndexOf(level);
export function deckFor(count) {
  const deck = [];
  const add = (kind, value, copies) => { for (let i=0;i<copies;i++) deck.push({ id: `c${deck.length}`, kind, ...(kind === 'location' ? { location: value } : { industries: value }) }); };
  for (const city of CITIES) if (count >= city.minPlayers) add('location', city.id, city.copies + (city.id === 'd17' && count === 4 ? 1 : 0));
  for (const [type,copies] of [['iron',4],['coal',count === 4 ? 3 : 2],['pottery',count === 4 ? 3 : 2],['beer',5]]) add('industry',[type],copies);
  add('industry',['cotton','goods'],count === 2 ? 0 : count === 3 ? 6 : 8);
  return deck;
}
export function merchantMix(count) {
  return [[],[],['cotton','goods','pottery'],['cotton'],['goods'],...(count >= 3 ? [['pottery'],['goods']] : []),...(count === 4 ? [['cotton','goods','pottery'],['cotton']] : [])];
}
