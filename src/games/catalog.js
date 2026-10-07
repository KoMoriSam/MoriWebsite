export const GAMES = [
  {
    id: "fogport",
    path: "/games/fogport",
    name: "fogport",
    icon: "ri-building-2-line",
    titleKey: "fogport.title",
    descriptionKey: "fogport.description",
    minPlayers: 2,
    maxPlayers: 4,
    metadata: [{ icon: "ri-route-line", labelKey: "fogport.genre" }],
    component: () => import("@/views/games/Fogport.vue"),
  },
  {
    id: "avalon",
    path: "/games/avalon",
    name: "avalon",
    icon: "ri-sword-line",
    titleKey: "avalon.title",
    descriptionKey: "avalon.description",
    minPlayers: 5,
    maxPlayers: 10,
    metadata: [{ icon: "ri-spy-line", labelKey: "avalon.genre" }],
    component: () => import("@/views/games/Avalon.vue"),
  },
];
export const findGame = (id) => GAMES.find((game) => game.id === id);
export const findRouteGame = (name) => GAMES.find((game) => game.name === name);
export const gameRoutes = GAMES.map((game) => ({
  path: game.path,
  name: game.name,
  component: game.component,
  meta: { navName: "games", gameType: game.id, hideToTop: true, localeGroups: ["games", game.id] },
}));
