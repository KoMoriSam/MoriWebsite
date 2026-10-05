import assert from "node:assert/strict";
import { avalon } from "./avalon/rules.js";
import {
  roleRoster,
  roleAlignment,
  LANCELOTS,
} from "../shared/games/avalon/index.js";
import {
  nightSignals,
  playerKnowledge,
} from "../shared/games/avalon/knowledge.js";
import {
  possibleRoles,
  playerAlignment,
  knownPlayer,
} from "../src/games/avalon/presentation.js";
import { possibleMarks, validNotes } from "../src/games/avalon/notes.js";

let checks = 0;
const check = (actual, expected) => {
  assert.deepEqual(actual, expected);
  checks++;
};
const rejects = (fn, code) => {
  assert.throws(fn, (error) => error.code === code);
  checks++;
};
function fixture(count, specialRoles, mode = "fixed") {
  const players = Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    nickname: `Player ${i}`,
  }));
  const config = { specialRoles, lancelotMode: mode };
  const state = avalon.create(players, () => 0, config);
  const roles = roleRoster(count, specialRoles).roles;
  state.roles = Object.fromEntries(players.map((p, i) => [p.id, roles[i]]));
  state.allegiances = Object.fromEntries(
    players.map((p) => [p.id, roleAlignment(state.roles[p.id])]),
  );
  state.leaderIndex = 0;
  state.openingLeaderId = players[0].id;
  return { state, players, config };
}
const idOf = (game, role) =>
  game.players.find((p) => game.state.roles[p.id] === role)?.id;
const view = (game, id) => ({
  code: "KNOWTEST",
  round: 1,
  selfId: id,
  players: game.players,
  gameConfig: game.config,
  game: avalon.view(game.state, game.players, id),
});
const flat = (room) => ({ ...room, ...room.game, game: room.round });
function reveal(game) {
  game.state.phase = "night";
  for (const player of game.players) game.state.roleRevealed[player.id] = true;
  return game;
}

// Known loyalty constrains identities, never to the actual hidden role alone.
for (const leaderRole of [
  "merlin",
  "assassin",
  "servant",
  "good_lancelot",
  "evil_lancelot",
  "untrustworthy_servant",
]) {
  const game = reveal(
    fixture(9, ["cleric", "untrustworthy_servant", ...LANCELOTS]),
  );
  game.state.openingLeaderId = idOf(game, leaderRole);
  const cleric = idOf(game, "cleric");
  const target = game.state.openingLeaderId;
  for (const switches of [0, 1, 2]) {
    game.state.lancelotMode = "switching";
    game.config.lancelotMode = "switching";
    game.state.lancelotSwitched = switches === 1;
    game.state.questIndex = switches ? switches + 1 : 0;
    game.state.lancelotDraws = Array.from({ length: switches }, (_, index) => ({
      quest: index + 2,
      switched: true,
    }));
    game.state.history = Array.from({ length: switches }, (_, quest) => ({
      type: "lancelot_draw",
      quest,
      switched: true,
    }));
    for (const p of game.players)
      game.state.allegiances[p.id] = roleAlignment(
        game.state.roles[p.id],
        switches === 1,
      );
    const snapshot = view(game, cleric);
    const knowledge = playerKnowledge(snapshot)[target];
    check(knowledge.initial, roleAlignment(leaderRole));
    const expected = [
      ...new Set(roleRoster(9, game.config.specialRoles).roles),
    ].filter(
      (role) =>
        role !== "cleric" && roleAlignment(role) === roleAlignment(leaderRole),
    );
    check(possibleRoles(snapshot, target).sort(), expected.sort());
    check(
      possibleRoles(flat(snapshot), target),
      possibleRoles(snapshot, target),
    );
    check(knowledge.roles.includes(leaderRole), true);
    if (switches > 0) {
      check(knowledge.current, null);
      check(
        knownPlayer(
          snapshot,
          game.players.find((p) => p.id === target),
          true,
        ).label,
        `avalon.knowledge.opening${knowledge.initial === "good" ? "Good" : "Evil"}`,
      );
    } else {
      check(knowledge.current, roleAlignment(leaderRole));
      check(
        knownPlayer(
          snapshot,
          game.players.find((p) => p.id === target),
          true,
        ).label,
        `avalon.knowledge.${roleAlignment(leaderRole)}`,
      );
    }
  }
}

// Exercise every supported information capability, observer, target, and two swaps.
for (const leaderRole of ["merlin", "assassin"]) {
  const game = reveal(
    fixture(7, ["cleric", "untrustworthy_servant", "mordred"]),
  );
  game.state.openingLeaderId = idOf(game, leaderRole);
  const snapshot = view(game, idOf(game, "cleric"));
  const target = game.players.find((p) => p.id === game.state.openingLeaderId);
  check(playerAlignment(snapshot, target.id), roleAlignment(leaderRole));
  check(
    knownPlayer(snapshot, target, true).label,
    `avalon.knowledge.${roleAlignment(leaderRole)}`,
  );
  check(possibleRoles(snapshot, target.id).length > 1, true);
}
const configurations = [
  [5, []],
  [5, ["percival", "morgana"]],
  [6, ["cleric"]],
  [7, ["cleric", ...LANCELOTS]],
  [7, ["cleric", "untrustworthy_servant", "mordred"]],
  [10, ["percival", "cleric", "untrustworthy_servant", "morgana", "mordred"]],
  [10, ["percival", "cleric", "untrustworthy_servant", "morgana", "oberon"]],
  [
    10,
    [
      "percival",
      "cleric",
      "untrustworthy_servant",
      "morgana",
      "mordred",
      ...LANCELOTS,
    ],
  ],
  ...["lunatic", "brute", "revealer", "oberon"].map((role) => [
    7,
    ["cleric", "untrustworthy_servant", role],
  ]),
];
for (const [count, specialRoles] of configurations) {
  for (const mode of specialRoles.includes("good_lancelot")
    ? ["fixed", "switching"]
    : ["fixed"]) {
    const game = reveal(fixture(count, specialRoles, mode));
    for (const player of game.players) {
      const hidden = fixture(count, specialRoles, mode);
      const snapshot = view(hidden, player.id);
      check(snapshot.game.self.role, null);
      check(snapshot.game.self.knownRoles, {});
      check(snapshot.game.self.knownEvil, []);
      check(snapshot.game.self.knownLoyalties, {});
    }
    for (const switches of mode === "switching" ? [0, 1, 2] : [0]) {
      game.state.lancelotSwitched = switches === 1;
      game.state.questIndex = switches ? switches + 1 : 0;
      game.state.lancelotDraws = Array.from(
        { length: switches },
        (_, index) => ({ quest: index + 2, switched: true }),
      );
      game.state.history = Array.from({ length: switches }, (_, quest) => ({
        type: "lancelot_draw",
        quest,
        switched: true,
      }));
      for (const p of game.players)
        game.state.allegiances[p.id] = roleAlignment(
          game.state.roles[p.id],
          switches === 1,
        );
      for (const observer of game.players) {
        const snapshot = view(game, observer.id);
        const knowledge = playerKnowledge(snapshot);
        const observerRole = game.state.roles[observer.id];
        check(possibleMarks(flat(snapshot), observer.id), []);
        check("roles" in snapshot.game, false);
        for (const target of game.players.filter((p) => p.id !== observer.id)) {
          const actualRole = game.state.roles[target.id];
          const candidates = knowledge[target.id].roles;
          check(candidates.includes(actualRole), true);
          check(possibleRoles(snapshot, target.id), candidates);
          check(
            candidates.every((role) =>
              roleRoster(count, specialRoles).roles.includes(role),
            ),
            true,
          );
          if (knowledge[target.id].current)
            check(
              knowledge[target.id].current,
              game.state.allegiances[target.id],
            );
          for (const signal of nightSignals(observerRole, mode)) {
            const seen = signal.exact
              ? Object.hasOwn(snapshot.game.self[signal.channel], target.id)
              : snapshot.game.self[signal.channel].includes(target.id);
            check(
              candidates.every((role) => signal.roles.includes(role) === seen),
              true,
            );
          }
          const marks = possibleMarks(flat(snapshot), target.id);
          check(
            candidates.length === 1
              ? marks.length === 0
              : candidates.every((role) => marks.includes(role)),
            true,
          );
        }
      }
    }
  }
}

// Counts can exclude an already identified unique role without hiding another plausible Good role.
{
  const game = reveal(fixture(7, ["cleric", ...LANCELOTS]));
  const cleric = idOf(game, "cleric");
  const target = idOf(game, "merlin");
  let snapshot = view(game, cleric);
  check(
    possibleRoles(snapshot, target).sort(),
    ["merlin", "servant", "good_lancelot"].sort(),
  );
  check(validNotes(flat(snapshot), { [target]: "good_lancelot" }), {
    [target]: "good_lancelot",
  });
  snapshot.game.self.knownRoles[idOf(game, "good_lancelot")] = "good_lancelot";
  check(possibleRoles(snapshot, target).sort(), ["merlin", "servant"].sort());
  check(validNotes(flat(snapshot), { [target]: "good_lancelot" }), {});
  check(validNotes(flat(snapshot), { [target]: "merlin" }), {
    [target]: "merlin",
  });
}

// Merlin's mixed signal is not actual Evil membership; the Servant knows only the Assassin.
const recruitment = reveal(
  fixture(7, ["cleric", "untrustworthy_servant", "mordred"]),
);
const assassin = idOf(recruitment, "assassin");
const servant = idOf(recruitment, "untrustworthy_servant");
const merlin = idOf(recruitment, "merlin");
const cleric = idOf(recruitment, "cleric");
check(view(recruitment, merlin).game.self.knownEvil.includes(servant), true);
check(
  view(recruitment, merlin).game.self.knownEvil.includes(
    idOf(recruitment, "mordred"),
  ),
  false,
);
check(view(recruitment, servant).game.self.knownRoles, {
  [assassin]: "assassin",
});
check(view(recruitment, servant).game.self.knownEvil, []);
check(view(recruitment, assassin).game.self.knownEvil.includes(servant), false);
check(playerAlignment(view(recruitment, merlin), servant), null);
check(
  knownPlayer(
    view(recruitment, merlin),
    recruitment.players.find((p) => p.id === servant),
    true,
  ).label,
  "avalon.knowledge.merlinSignal",
);
recruitment.state.openingLeaderId = servant;
check(playerAlignment(view(recruitment, cleric), servant), "good");

const apply = (game, id, type, payload = {}) => {
  const result = avalon.apply(
    game.state,
    game.players,
    id,
    { type, ...payload },
    1000,
  );
  game.state = result.state;
  return result;
};
// Run actual team/vote/quest actions through all three successes, not a mocked terminal phase.
recruitment.state.phase = "team";
for (let quest = 0; quest < 3; quest++) {
  const leader = recruitment.players[recruitment.state.leaderIndex].id;
  if (recruitment.state.phase === "discussion")
    apply(recruitment, leader, "begin_team");
  const team = [
    servant,
    ...recruitment.players.filter((p) => p.id !== servant).map((p) => p.id),
  ].slice(0, [2, 3, 3][quest]);
  apply(recruitment, leader, "team", { team });
  for (const p of recruitment.players.filter((p) => p.id !== leader))
    apply(recruitment, p.id, "vote", { approve: true });
  rejects(
    () => apply(recruitment, servant, "quest", { success: false }),
    "GOOD_CANNOT_FAIL",
  );
  for (const id of team) apply(recruitment, id, "quest", { success: true });
}
check(recruitment.state.phase, "evil_discussion");
const timed = avalon.tick(
  recruitment.state,
  recruitment.players,
  recruitment.state.discussion.endsAt,
);
check(timed.state.phase, "recruit");
check(timed.state.history.at(-1).type, "begin_recruit");
apply(recruitment, assassin, "end_assassination_discussion");
check(recruitment.state.phase, "recruit");
rejects(
  () => apply(recruitment, servant, "recruit", { targetId: cleric }),
  "ASSASSIN_ONLY",
);
rejects(
  () => apply(recruitment, assassin, "recruit", { targetId: assassin }),
  "TARGET",
);
rejects(
  () => apply(recruitment, assassin, "assassinate", { targetId: merlin }),
  "PHASE",
);
for (const success of [true, false]) {
  const attempt = structuredClone(recruitment);
  apply(attempt, assassin, "recruit", { targetId: success ? servant : cleric });
  check(attempt.state.phase, "assassinate");
  check(attempt.state.roles[servant], "untrustworthy_servant");
  check(view(attempt, servant).game.self.alignment, success ? "evil" : "good");
  check(view(attempt, servant).game.self.knownRoles, {
    [assassin]: "assassin",
  });
  check(view(attempt, servant).game.self.questChoices, [true]);
  check(
    view(attempt, cleric).game.publicRoles[servant],
    success ? "untrustworthy_servant" : undefined,
  );
  check(
    view(attempt, cleric).game.assassinationActorId,
    success ? servant : null,
  );
  check(
    view(attempt, cleric).game.alignmentCounts,
    success ? { good: 3, evil: 4 } : { good: 4, evil: 3 },
  );
  check(
    playerAlignment(view(attempt, cleric), servant),
    success ? "evil" : "good",
  );
  if (success)
    check(validNotes(flat(view(attempt, cleric)), { [servant]: "merlin" }), {});
  rejects(
    () => apply(attempt, assassin, "recruit", { targetId: servant }),
    "PHASE",
  );
  rejects(
    () =>
      apply(attempt, success ? assassin : servant, "assassinate", {
        targetId: merlin,
      }),
    "ASSASSIN_ONLY",
  );
  if (!success)
    check(
      possibleRoles(view(attempt, assassin), cleric).includes(
        "untrustworthy_servant",
      ),
      false,
    );
  for (const hit of [true, false]) {
    const ending = structuredClone(attempt);
    apply(ending, success ? servant : assassin, "assassinate", {
      targetId: hit ? merlin : cleric,
    });
    check(ending.state.result.winner, hit ? "evil" : "good");
    check(view(ending, servant).game.self.won, success === hit);
    check(
      view(ending, servant).game.revealedRoles[servant],
      "untrustworthy_servant",
    );
    check(
      view(ending, servant).game.revealedAllegiances[servant],
      success ? "evil" : "good",
    );
  }
}
console.log(`Avalon knowledge and recruitment: ${checks} assertions passed.`);
