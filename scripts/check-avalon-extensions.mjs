import assert from "node:assert/strict";
import { avalon } from "./avalon/rules.js";
import {
  LANCELOTS,
  roleAlignment,
  QUEST_TEAMS,
  ROLES,
  ladyTargetIds,
} from "../shared/games/avalon/index.js";
import { roleRecommendations } from "../shared/games/avalon/recommendations.js";
import { playerKnowledge } from "../shared/games/avalon/knowledge.js";
import { audioSnapshot, audioCue } from "../src/games/audio.js";
import { roleImage } from "../src/games/avalon/presentation.js";

let checks = 0;
const check = (actual, expected) => {
  assert.deepEqual(actual, expected);
  checks++;
};
const rejects = (fn, code) => {
  assert.throws(fn, (error) => error.code === code);
  checks++;
};
function fixture(specialRoles = LANCELOTS, options = {}, count = 10) {
  const players = Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    nickname: `Player ${i}`,
  }));
  const config = { specialRoles, ...options };
  return {
    players,
    config,
    state: avalon.create(players, (max) => max - 1, config),
  };
}
const idOf = (game, role) =>
  Object.keys(game.state.roles).find((id) => game.state.roles[id] === role);
const act = (game, id, type, data = {}) => {
  game.state = avalon.apply(
    game.state,
    game.players,
    id,
    {
      type,
      ...(type === "report_loyalty"
        ? { checkId: game.state.loyaltyCheck?.id }
        : {}),
      ...data,
    },
    1000,
  ).state;
};
const view = (game, id) => ({
  code: "EXTENSIONS",
  round: 1,
  selfId: id,
  gameType: "avalon",
  players: game.players,
  gameConfig: game.config,
  game: avalon.view(game.state, game.players, id),
});
function opening(game) {
  for (const p of game.players) act(game, p.id, "confirm_opening");
}
function reveal(game, report = null) {
  opening(game);
  for (const p of game.players) act(game, p.id, "peek_role");
  if (game.state.loyaltyCheck) {
    const id = game.state.loyaltyCheck.targetId;
    act(game, id, "report_loyalty", {
      alignment: report ?? game.state.allegiances[id],
    });
  }
  for (const p of game.players) act(game, p.id, "confirm_role");
}
function quest(game, failed = false, leaveLast = false) {
  const leader = game.players[game.state.leaderIndex].id;
  act(game, leader, "begin_team");
  const assassin = idOf(game, "assassin");
  const team = [
    assassin,
    ...game.players.map((p) => p.id).filter((id) => id !== assassin),
  ].slice(0, QUEST_TEAMS[game.players.length][game.state.questIndex]);
  act(game, leader, "team", { team });
  for (const p of game.players.filter((p) => p.id !== leader))
    act(game, p.id, "vote", { approve: true });
  for (const id of leaveLast ? team.slice(0, -1) : team)
    act(game, id, "quest", { success: !(failed && id === assassin) });
  return team.at(-1);
}

// Public opening confirmation is a server barrier, not a local overlay.
{
  const game = fixture(["cleric"]);
  check(game.state.phase, "opening");
  for (const p of game.players) {
    const data = view(game, p.id).game;
    check(data.leaderId, game.state.openingLeaderId);
    check(data.self.role, null);
    check(data.self.knownEvil, []);
    check(data.self.knownLoyalties, {});
    check(data.self.questChoices, []);
    rejects(() => act(game, p.id, "peek_role"), "PHASE");
  }
  for (const p of game.players.slice(0, -1)) act(game, p.id, "confirm_opening");
  check(game.state.phase, "opening");
  rejects(
    () => act(game, game.players[0].id, "confirm_opening"),
    "ALREADY_SUBMITTED",
  );
  const recovered = JSON.parse(JSON.stringify(game));
  check(
    view(recovered, recovered.players[0].id).game.self.openingConfirmed,
    true,
  );
  act(game, game.players.at(-1).id, "confirm_opening");
  check(game.state.phase, "night");
  check(game.state.openingLeaderId, recovered.state.openingLeaderId);
  for (const p of game.players) check(view(game, p.id).game.self.role, null);
}

// Cleric checks Good and Evil opening leaders, with no identity disclosure.
for (const leaderRole of ["merlin", "assassin"]) {
  const game = fixture(["cleric"]);
  game.state.openingLeaderId = idOf(game, leaderRole);
  game.state.leaderIndex = game.players.findIndex(
    (p) => p.id === game.state.openingLeaderId,
  );
  opening(game);
  const cleric = idOf(game, "cleric"),
    leader = game.state.openingLeaderId;
  act(game, cleric, "peek_role");
  act(game, leader, "peek_role");
  check(view(game, cleric).game.self.knownLoyalties, {});
  rejects(() => act(game, cleric, "confirm_role"), "LOYALTY_PENDING");
  rejects(
    () =>
      act(game, leader, "report_loyalty", {
        alignment: roleAlignment(leaderRole) === "good" ? "evil" : "good",
      }),
    "LOYALTY_TRUTH",
  );
  act(game, leader, "report_loyalty", { alignment: roleAlignment(leaderRole) });
  const knowledge = playerKnowledge(view(game, cleric))[leader];
  check(knowledge.current, roleAlignment(leaderRole));
  check(knowledge.roles.includes(leaderRole), true);
  check(knowledge.roles.length > 1, true);
  const frozen = structuredClone(view(game, cleric).game.self.knownLoyalties);
  game.state.leaderIndex = (game.state.leaderIndex + 1) % game.players.length;
  check(view(game, cleric).game.self.knownLoyalties, frozen);
}

// A Cleric who is the first Leader knows their own loyalty without submitting a card.
{
  const game = fixture(["cleric"]);
  const cleric = idOf(game, "cleric");
  game.state.openingLeaderId = cleric;
  game.state.leaderIndex = game.players.findIndex((p) => p.id === cleric);
  opening(game);
  check(game.state.loyaltyCheck, null);
  check(view(game, cleric).game.self.knownLoyalties, {});
  act(game, cleric, "peek_role");
  const self = view(game, cleric).game.self;
  check(self.knownLoyalties, { [cleric]: "good" });
  check(self.loyaltyRequest, null);
  check(self.loyaltyPending, false);
  act(game, cleric, "confirm_role");
  for (const p of game.players.filter((p) => p.id !== cleric)) {
    act(game, p.id, "peek_role");
    check(view(game, p.id).game.self.knownLoyalties, {});
    act(game, p.id, "confirm_role");
  }
  check(game.state.phase, "discussion");
}

// Trickster chooses either loyalty card, remains Evil and retains normal Evil vision.
for (const reported of ["good", "evil"]) {
  const game = fixture(["cleric", "trickster"]);
  const trickster = idOf(game, "trickster"),
    cleric = idOf(game, "cleric");
  game.state.openingLeaderId = trickster;
  opening(game);
  for (const p of game.players) act(game, p.id, "peek_role");
  check(view(game, trickster).game.self.loyaltyRequest.choices, [
    "good",
    "evil",
  ]);
  rejects(
    () => act(game, cleric, "report_loyalty", { alignment: reported }),
    "LOYALTY_TARGET_ONLY",
  );
  act(game, trickster, "report_loyalty", { alignment: reported });
  check(view(game, cleric).game.self.knownLoyalties[trickster], reported);
  const knowledge = playerKnowledge(view(game, cleric))[trickster];
  check(knowledge.roles.includes("trickster"), true);
  check(knowledge.current, reported === "good" ? null : "evil");
  check(view(game, trickster).game.self.alignment, "evil");
  check(view(game, trickster).game.self.questChoices, [true, false]);
  check(
    view(game, trickster).game.self.knownEvil.includes(idOf(game, "assassin")),
    true,
  );
  check(
    view(game, idOf(game, "merlin")).game.self.knownEvil.includes(trickster),
    true,
  );
  check(
    view(game, idOf(game, "assassin")).game.self.knownEvil.includes(trickster),
    true,
  );
  check(view(game, idOf(game, "servant")).game.self.loyaltyObservations, []);
  check(
    game.state.history.some((entry) => "alignment" in entry),
    false,
  );
}
check(ROLES.includes("trickster"), true);
check(roleImage("trickster"), "/assets/images/games/avalon/trickster.webp");
check(
  roleRecommendations(8, { specialRoles: [] })
    .find((g) => g.level === "discouraged")
    .roles.includes("trickster"),
  true,
);
check(
  roleRecommendations(8, { ladyOfTheLake: true })
    .find((g) => g.level === "optional")
    .roles.includes("trickster"),
  true,
);
check(
  roleRecommendations(8, { specialRoles: ["cleric"] })
    .find((g) => g.level === "optional")
    .roles.includes("trickster"),
  true,
);

// Exhaust every deck permutation: no draws for 1/2, one per 3/4/5, no replacement.
for (let first = 0; first < 5; first++)
  for (let second = first + 1; second < 5; second++) {
    const game = fixture(["cleric", "oberon", ...LANCELOTS], {
      lancelotMode: "switching",
    });
    const deck = Array.from(
      { length: 5 },
      (_, i) => i === first || i === second,
    );
    check(game.state.lancelotDeck.length, 5);
    check(game.state.lancelotDeck.filter(Boolean).length, 2);
    game.state.lancelotDeck = [...deck];
    reveal(game);
    const good = idOf(game, "good_lancelot"),
      evil = idOf(game, "evil_lancelot"),
      assassin = idOf(game, "assassin"),
      oberon = idOf(game, "oberon");
    const roles = structuredClone(game.state.roles);
    const initial = Object.fromEntries(
      game.players.map((p) => [p.id, view(game, p.id).game.self]),
    );
    check(initial[good].knownRoles, {});
    check(initial[evil].knownRoles, {});
    check(initial[evil].knownEvil, []);
    check(initial[assassin].knownEvil.includes(evil), true);
    check(initial[assassin].knownEvil.includes(oberon), false);
    check(initial[oberon].knownEvil, []);
    for (let index = 0; index < 5; index++) {
      const drawCount = Math.max(0, index - 1),
        switched = deck.slice(0, drawCount).filter(Boolean).length % 2 === 1;
      check(game.state.lancelotDraws.length, drawCount);
      check(game.state.lancelotDeck.length, 5 - drawCount);
      check(game.state.allegiances[good], switched ? "evil" : "good");
      check(game.state.roles, roles);
      for (const p of game.players) {
        const data = view(game, p.id).game;
        for (const field of [
          "knownEvil",
          "knownRoles",
          "knownCandidates",
          "knownLoyalties",
        ])
          check(data.self[field], initial[p.id][field]);
        check("lancelotSwitched" in data, false);
        check("lancelotDeck" in data, false);
        check("allegiances" in data, false);
        check(
          data.history.some((entry) => entry.type === "lancelot_draw"),
          false,
        );
        check(
          data.self.lancelotDraws.map((draw) => draw.switched),
          LANCELOTS.includes(roles[p.id]) ? deck.slice(0, drawCount) : [],
        );
        for (const [id, knowledge] of Object.entries(
          playerKnowledge(view(game, p.id)),
        )) {
          check(knowledge.roles.includes(roles[id]), true);
          if (knowledge.current)
            check(knowledge.current, game.state.allegiances[id]);
        }
      }
      check(
        view(game, good).game.self.questChoices,
        switched ? [true, false] : [true],
      );
      check(
        view(game, evil).game.self.questChoices,
        switched ? [true] : [true, false],
      );
      const attempt = structuredClone(game);
      const actingLeader = attempt.players[attempt.state.leaderIndex].id;
      act(attempt, actingLeader, "begin_team");
      const team = [
        good,
        evil,
        ...attempt.players
          .map((p) => p.id)
          .filter((id) => id !== good && id !== evil),
      ].slice(0, QUEST_TEAMS[10][index]);
      act(attempt, actingLeader, "team", { team });
      for (const p of attempt.players.filter((p) => p.id !== actingLeader))
        act(attempt, p.id, "vote", { approve: true });
      rejects(
        () => act(attempt, switched ? evil : good, "quest", { success: false }),
        "GOOD_CANNOT_FAIL",
      );
      act(attempt, switched ? good : evil, "quest", { success: false });
      check(attempt.state.questCards[switched ? good : evil], false);
      // Rejection never consumes another private card.
      const leader = game.players[game.state.leaderIndex].id;
      act(game, leader, "begin_team");
      act(game, leader, "team", {
        team: game.players.slice(0, QUEST_TEAMS[10][index]).map((p) => p.id),
      });
      for (const p of game.players.filter((p) => p.id !== leader))
        act(game, p.id, "vote", { approve: false });
      check(game.state.lancelotDraws.length, drawCount);
      quest(game, index < 2);
    }
    check(game.state.phase, "evil_discussion");
    check(game.state.lancelotDraws.length, 3);
    const finalSwitched = deck.slice(0, 3).filter(Boolean).length % 2 === 1;
    const ending = structuredClone(game);
    act(ending, assassin, "end_assassination_discussion");
    act(ending, assassin, "assassinate", { targetId: idOf(ending, "merlin") });
    check(view(ending, good).game.self.won, finalSwitched);
    check(view(ending, evil).game.self.won, !finalSwitched);
    check(
      view(ending, good).game.revealedAllegiances[good],
      finalSwitched ? "evil" : "good",
    );
    const goodEnding = structuredClone(game);
    act(goodEnding, assassin, "end_assassination_discussion");
    act(goodEnding, assassin, "assassinate", { targetId: good });
    check(view(goodEnding, good).game.self.won, !finalSwitched);
    check(view(goodEnding, evil).game.self.won, finalSwitched);
  }

// Ordinary observers receive byte-identical game views for Switch and No Change.
for (const reason of ["quests", "rejections"]) {
  const game = fixture(LANCELOTS, { lancelotMode: "switching" });
  game.state.lancelotDeck = [true, false, false, true, false];
  reveal(game);
  quest(game, true);
  quest(game, true);
  if (reason === "quests") quest(game, true);
  else
    for (let attempt = 0; attempt < 5; attempt++) {
      const leader = game.players[game.state.leaderIndex].id;
      act(game, leader, "begin_team");
      act(game, leader, "team", {
        team: game.players.slice(0, QUEST_TEAMS[10][2]).map((p) => p.id),
      });
      for (const p of game.players.filter((p) => p.id !== leader))
        act(game, p.id, "vote", { approve: false });
    }
  check(game.state.result, { winner: "evil", reason, targetId: null });
  check(game.state.lancelotDraws.length, 1);
  check(view(game, idOf(game, "good_lancelot")).game.self.won, true);
  check(view(game, idOf(game, "evil_lancelot")).game.self.won, false);
}
{
  const game = fixture(["cleric", ...LANCELOTS], { lancelotMode: "switching" });
  reveal(game);
  quest(game);
  const last = quest(game, false, true);
  const before = structuredClone(game),
    switched = structuredClone(game),
    unchanged = structuredClone(game);
  switched.state.lancelotDeck = [true, false, false, true, false];
  unchanged.state.lancelotDeck = [false, true, false, true, false];
  act(switched, last, "quest", { success: true });
  act(unchanged, last, "quest", { success: true });
  for (const p of game.players) {
    if (LANCELOTS.includes(game.state.roles[p.id])) {
      check(
        audioCue(
          "avalon",
          audioSnapshot(view(switched, p.id)),
          audioSnapshot(view(before, p.id)),
        ),
        "lancelotSwitch",
      );
    } else {
      check(view(switched, p.id).game, view(unchanged, p.id).game);
      check(
        audioSnapshot(view(switched, p.id)),
        audioSnapshot(view(unchanged, p.id)),
      );
    }
  }
  check(
    view(JSON.parse(JSON.stringify(switched)), idOf(switched, "good_lancelot"))
      .game,
    view(switched, idOf(switched, "good_lancelot")).game,
  );
}

// Lady is independent of role capacity, checks only after 2/3/4, and passes privately.
for (const enabled of [false, true]) {
  const game = fixture(["trickster", ...LANCELOTS], {
    ladyOfTheLake: enabled,
    lancelotMode: "switching",
  });
  const initialHolder = game.players[(game.state.leaderIndex + 9) % 10].id;
  check(game.state.lady?.holderId ?? null, enabled ? initialHolder : null);
  if (enabled && initialHolder === idOf(game, "trickster")) {
    game.state.leaderIndex = 0;
    game.state.openingLeaderId = game.players[0].id;
    game.state.lady.holderId = game.players.at(-1).id;
  }
  const originalRoles = structuredClone(game.state.roles);
  reveal(game);
  quest(game, true);
  check(game.state.phase, "discussion");
  for (let index = 1; index < 5; index++) {
    quest(game, index === 2);
    if (index === 4) {
      check(game.state.phase, "evil_discussion");
      break;
    }
    check(game.state.phase, enabled ? "lady" : "discussion");
    if (!enabled) continue;
    const holder = game.state.lady.holderId;
    const eligible = ladyTargetIds(game.players, view(game, holder).game.lady);
    for (const player of game.players) {
      const allowed =
        player.id !== holder && !game.state.lady.usedBy.includes(player.id);
      check(eligible.includes(player.id), allowed);
      if (allowed) {
        const candidate = structuredClone(game);
        act(candidate, holder, "lady", { targetId: player.id });
        check(candidate.state.loyaltyCheck.targetId, player.id);
      }
    }
    const target =
      index === 1
        ? idOf(game, "trickster")
        : game.players.find(
            (p) => p.id !== holder && !game.state.lady.usedBy.includes(p.id),
          ).id;
    rejects(() => act(game, target, "lady", { targetId: holder }), "LADY_ONLY");
    rejects(
      () => act(game, holder, "lady", { targetId: holder }),
      "LADY_TARGET",
    );
    for (const id of game.state.lady.usedBy)
      rejects(() => act(game, holder, "lady", { targetId: id }), "LADY_TARGET");
    const drawCount = game.state.lancelotDraws.length;
    act(game, holder, "lady", { targetId: target });
    check(ladyTargetIds(game.players, view(game, holder).game.lady), []);
    check(game.state.lancelotDraws.length, drawCount);
    check(
      view(game, target).game.self.loyaltyRequest.choices,
      index === 1 ? ["good", "evil"] : [game.state.allegiances[target]],
    );
    check(view(game, holder).game.self.loyaltyRequest, null);
    rejects(
      () => act(game, holder, "report_loyalty", { alignment: "good" }),
      "LOYALTY_TARGET_ONLY",
    );
    act(game, target, "report_loyalty", {
      alignment: index === 1 ? "good" : game.state.allegiances[target],
    });
    check(game.state.lady.holderId, target);
    check(game.state.lady.usedBy.includes(holder), true);
    check(game.state.phase, "discussion");
    check(
      view(game, holder).game.self.loyaltyObservations.at(-1).targetId,
      target,
    );
    if (index === 1)
      check(
        playerKnowledge(view(game, holder))[target].roles.includes("trickster"),
        true,
      );
    for (const p of game.players.filter((p) => p.id !== holder))
      check(
        view(game, p.id).game.self.loyaltyObservations.some(
          (o) => o.observerId === holder,
        ),
        false,
      );
    for (const entry of view(game, holder).game.history) {
      check("alignment" in entry, false);
      check("switched" in entry, false);
    }
    check(game.state.roles, originalRoles);
  }
  check(
    game.state.history.filter((entry) => entry.type === "lady").length,
    enabled ? 3 : 0,
  );
}
check(avalon.normalizeConfig({ specialRoles: [], ladyOfTheLake: true }), {
  specialRoles: [],
  ladyOfTheLake: true,
});
check(avalon.normalizeConfig({ specialRoles: [], ladyOfTheLake: false }), {
  specialRoles: [],
});
rejects(
  () => avalon.normalizeConfig({ specialRoles: [], ladyOfTheLake: "yes" }),
  "ROLE_CONFIG",
);

// A check token survives reconnects and cannot answer a later check of the same player.
{
  const game = fixture(["cleric", "trickster"], { ladyOfTheLake: true });
  const target = idOf(game, "trickster");
  game.state.openingLeaderId = target;
  opening(game);
  const firstId = game.state.loyaltyCheck.id;
  check(view(game, target).game.self.loyaltyRequest, null);
  for (const player of game.players) act(game, player.id, "peek_role");
  check(view(game, target).game.self.loyaltyRequest.id, firstId);
  check(
    view(JSON.parse(JSON.stringify(game)), target).game.self.loyaltyRequest.id,
    firstId,
  );
  check(Object.keys(view(game, target).game.self.loyaltyRequest).sort(), [
    "choices",
    "id",
    "source",
  ]);
  for (const player of game.players.filter((p) => p.id !== target))
    check(view(game, player.id).game.self.loyaltyRequest, null);
  for (const checkId of [undefined, "old-check"]) {
    const before = structuredClone(game.state);
    rejects(
      () => act(game, target, "report_loyalty", { alignment: "good", checkId }),
      "LOYALTY_CHANGED",
    );
    check(game.state, before);
  }
  act(game, target, "report_loyalty", { alignment: "good" });
  for (const player of game.players) act(game, player.id, "confirm_role");
  quest(game);
  quest(game, true);
  const holder = game.state.lady.holderId;
  act(game, holder, "lady", { targetId: target });
  check(game.state.loyaltyCheck.id !== firstId, true);
  const before = structuredClone(game.state);
  rejects(
    () =>
      act(game, target, "report_loyalty", {
        alignment: "evil",
        checkId: firstId,
      }),
    "LOYALTY_CHANGED",
  );
  check(game.state, before);
  act(game, target, "report_loyalty", { alignment: "evil" });
  check(
    view(game, holder).game.self.loyaltyObservations.at(-1).alignment,
    "evil",
  );
  check(game.state.phase, "discussion");
}

// Historical checks survive a later hidden swap and a Servant's public recruitment.
{
  const game = fixture(["cleric", "untrustworthy_servant", ...LANCELOTS], {
    ladyOfTheLake: true,
    lancelotMode: "switching",
  });
  reveal(game);
  const observer = idOf(game, "cleric"),
    servant = idOf(game, "untrustworthy_servant"),
    good = idOf(game, "good_lancelot");
  game.state.loyaltyObservations[observer] = [
    {
      source: "lady",
      observerId: observer,
      targetId: servant,
      quest: 1,
      alignment: "good",
      at: 1000,
    },
  ];
  game.state.recruitedId = servant;
  game.state.allegiances[servant] = "evil";
  check(playerKnowledge(view(game, observer))[servant].roles, [
    "untrustworthy_servant",
  ]);
  check(playerKnowledge(view(game, observer))[servant].current, "evil");
  game.state.loyaltyObservations[observer].push({
    source: "lady",
    observerId: observer,
    targetId: good,
    quest: 2,
    alignment: "evil",
    at: 1001,
  });
  game.state.lancelotSwitched = false;
  game.state.questIndex = 4;
  game.state.phase = "finished";
  game.state.result = { winner: "good", reason: "assassination" };
  check(playerKnowledge(view(game, observer))[good].roles, ["good_lancelot"]);
  check(playerKnowledge(view(game, observer))[good].current, "good");
}
console.log(`Avalon private variants: ${checks} assertions passed.`);
