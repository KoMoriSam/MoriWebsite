// Latest map2.png is the coordinate and corridor reference. Annotation labels are
// not public IDs: preserve cards, original industry slots and project place names.
export const BOARD_VERSION = 'original-corridors-v4';
export const MAP_SIZE = 1000;
export const MAP_ART_SIZE = 1254;
export const MAP_ANNOTATION_SIZE = 1280;
export const ANNOTATION_NODES = {
  d1:'d10', d2:'d1', d3:'d14', d4:'d15', d5:'d17', d6:'d7',
  d7:'d13', d8:'d3', d9:'f1', d10:'d4', d11:'d16', d12:'d5',
  d13:'d19', d14:'d18', d15:'d11', d16:'d8', d17:'d2', d18:'d6',
  d19:'d9', d20:'d12', d21:'f2', d22:'d20',
  p1:'p4', p2:'p5', p3:'p1', p4:'p3', p5:'p2',
};
// Exact marker centres in the 1280px annotation. Scale the entire reference
// uniformly onto the unmarked 1254px artwork, including all path control points.
export const ANNOTATION_POINTS = {
  d1:[707,91], d2:[930,131], d3:[522,179], d4:[387,319],
  d5:[719,295], d6:[989,332], d7:[511,437], d8:[872,473],
  d9:[377,561], d10:[608,568], d11:[893,633], d12:[290,684],
  d13:[463,686], d14:[677,714], d15:[1007,762], d16:[529,842],
  d17:[800,889], d18:[1026,926], d19:[412,978], d20:[742,1062],
  d21:[331,1078], d22:[474,1142],
  p1:[349,94], p2:[1154,242], p3:[105,704], p4:[943,1086], p5:[634,1185],
};
const artUnit = n => n * MAP_ART_SIZE / MAP_ANNOTATION_SIZE;
export const MAP_PIXEL_POINTS = Object.fromEntries(
  Object.entries(ANNOTATION_POINTS).map(([label, point]) => [ANNOTATION_NODES[label], point.map(artUnit)]),
);
// id, annotation endpoints, era scope, traced cubic sections in annotation pixels.
// Visible curves, hover strokes and pointer hit areas all consume these sections.
// Crossings are not stops. Ordinary corridors each have exactly two endpoints.
const corridors = [
  ['l36','p1','d3','both',[[419,105,459,120,522,179]]],
  ['l37','d3','d1','both',[[550,113,615,82,707,91]]],
  ['l35','d3','d4','both',[[500,256,465,289,387,319]]],
  ['l1','d2','d6','both',[[984,193,1009,238,989,332]]],
  ['l24','d6','p2','both',[[1038,282,1089,247,1154,242]]],
  ['l34','d4','d7','both',[[342,427,411,458,511,437]]],
  ['l13','d4','d8','both',[[548.667,370.333,710.333,421.667,872,473]]],
  ['l16','d7','d10','both',[[582,452,625,470,608,568]]],
  ['l14','d8','d6','both',[[950,445,985,413,989,332]]],
  ['l38','d9','d10','both',[[452,541,531,559,608,568]]],
  ['l19','d10','d13','both',[[545,598,486,628,463,686]]],
  ['l18','d10','d14','both',[[695,575,705,640,677,714]]],
  ['l21','p3','d12','both',[[164,693,215,689,290,684]]],
  ['l22','d12','d13','both',[[345,694,410,690,463,686]]],
  ['l17','d13','d14','both',[[551,693,615,683,677,714]]],
  ['l15','d13','d16','both',[[453,758,480,797,529,842]]],
  ['l20','d12','d19','both',[[249,820,304,931,412,978]]],
  ['l25','d16','d19','both',[[457,865,428,910,412,978]]],
  ['l4','d16','d17','both',[[624,834,677,919,800,889]]],
  ['l5','d14','d17','both',[[686,808,718,860,800,889]]],
  ['l8','d8','d11','both',[[890,525,888,580,893,633]]],
  ['l23','d11','d15','both',[[981,607,1023,730,1007,762]]],
  ['l6','d11','d17','both',[[954,720,866,829,800,889]]],
  ['l9','d17','d18','both',[[867,938,941,941,1026,926]]],
  ['l7','d17','d20','both',[[791,937,799,977,742,1062]]],
  ['l2','d17','p4','both',[[871,932,945,986,943,1086]]],
  ['l10','d17','d22','both',[[702,901,655,934,625,1023],[593,1102,557,1129,474,1142]]],
  ['l30','d19','d22','both',[[414,1010,417,1048,431,1072],[443,1100,450,1125,474,1142]]],
  ['l33','d20','p4','both',[[811,1060,882,1072,943,1086]]],
  ['l28','d20','p5','both',[[644,1050,619,1121,634,1185]]],
  ['l29','d22','p5','both',[[523,1166,575,1191,634,1185]]],
  ['l11','d1','d2','railOnly',[[814,82,857,92,930,131]]],
  ['l12','d4','d5','railOnly',[[513,305,570,296,719,295]]],
  ['l26','d5','d6','railOnly',[[813,314,901,340,989,332]]],
  ['l27','d10','d8','railOnly',[[702,562,752,453,872,473]]],
  ['l31','d14','d11','railOnly',[[770,743,812,686,893,633]]],
  ['l32','d17','d15','railOnly',[[865,880,895,874,920,845],[943,798,960,768,1007,762]]],
  ['l39','d15','d18','railOnly',[[1141,740,1143,866,1026,926]]],
  ['l3','d14','d8','canalOnly',[[745,652,727,616,772,561],[795,529,835,502,872,473]]],
];
export const BOARD_ROADS = corridors.map(([id,a,b,scope,curves]) => {
  const canal=scope!=='railOnly', rail=scope!=='canalOnly';
  const road={id, nodes:[ANNOTATION_NODES[a],ANNOTATION_NODES[b]], scope, canal, rail,
    transport:{...(canal?{canal:'canal'}:{}),...(rail?{rail:'railway'}:{})},
    curves:curves.map(section=>section.map(artUnit))};
  // Southern farm: the spur and the two towns use one tile and one rule corridor.
  // Its endpoint is an actual point on the main curve, not a separate connection.
  if(id==='l30') {
    road.nodes.push(ANNOTATION_NODES.d21);
    road.branches=[{from:ANNOTATION_NODES.d21,to:[431,1072].map(artUnit),
      curves:[[364,1079,399,1073,431,1072].map(artUnit)]}];
  }
  return road;
});
