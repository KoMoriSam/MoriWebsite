import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const runtime = createRequire(require.resolve("wrangler/package.json"));
const { build } = runtime("esbuild");
const { Miniflare, convertV4MiniflareOptions } = runtime("miniflare");
const bundle = await build({
  stdin: {
    contents: `
      import { GameRoom } from './scripts/games/room.js';
      export class TestedRoom extends GameRoom {
        async inspect() {
          return { room: this.read(false), alarm: await this.ctx.storage.getAlarm(),
            tables: this.ctx.storage.sql.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('room', 'tickets', 'limits')").toArray() };
        }
      }
      export default { async fetch(request, env) {
        const url = new URL(request.url);
        const room = env.ROOMS.getByName('room:' + url.searchParams.get('code'));
        try {
          if (url.pathname === '/socket') return room.fetch(request);
          const body = request.method === 'POST' ? await request.json() : {};
          const result = url.pathname === '/create' ? await room.create(url.searchParams.get('code'), body.gameType, body.nickname)
            : url.pathname === '/join' ? await room.join(body.nickname, body.gameType)
            : url.pathname === '/connect' ? await room.ticket(body.token)
            : await room.inspect();
          return Response.json(result);
        } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
      } };
    `,
    resolveDir: process.cwd(),
    sourcefile: "room-dissolution-test.js",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
  external: ["cloudflare:workers"],
});
const options = {
  name: "room-dissolution",
  modules: true,
  script: bundle.outputFiles[0].text,
  compatibilityDate: "2026-08-23",
  compatibilityFlags: ["nodejs_compat"],
  durableObjects: { ROOMS: { className: "TestedRoom", useSQLite: true } },
  cf: false,
};
const mf = new Miniflare(
  convertV4MiniflareOptions ? convertV4MiniflareOptions(options) : options,
);
const sockets = [];
async function request(code, operation, body) {
  const response = await mf.dispatchFetch(
    `http://localhost/${operation}?code=${code}`,
    {
      method: body ? "POST" : "GET",
      ...(body
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    },
  );
  return response.json();
}
async function connect(seat) {
  const ticket = await request(seat.code, "connect", { token: seat.token });
  const response = await mf.dispatchFetch(
    `http://localhost/socket?code=${seat.code}`,
    {
      headers: {
        Upgrade: "websocket",
        "Sec-WebSocket-Protocol": `games,ticket-${ticket.ticket}`,
      },
    },
  );
  assert.equal(response.status, 101);
  const ws = response.webSocket;
  const messages = [];
  ws.addEventListener("message", (event) =>
    messages.push(JSON.parse(event.data)),
  );
  ws.accept();
  sockets.push(ws);
  const client = {
    ws,
    messages,
    get state() {
      return messages.findLast((item) => item.type === "state")?.room;
    },
  };
  await until(() => client.state);
  return client;
}
async function until(predicate) {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    if (Date.now() > deadline)
      throw new Error("Room dissolution test timed out");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
async function send(client, type, payload = {}) {
  const command = {
    type,
    id: crypto.randomUUID(),
    stage: client.state.stage,
    ...payload,
  };
  client.ws.send(JSON.stringify(command));
  await until(() => client.messages.some((item) => item.id === command.id));
  return client.messages.find((item) => item.id === command.id);
}
try {
  for (const [code, gameType, status] of [
    ["ABCDEFGH", "avalon", "lobby"],
    ["BCDEFGHJ", "fogport", "playing"],
    ["CDEFGHJK", "fogport", "finished"],
  ]) {
    const hostSeat = await request(code, "create", {
      gameType,
      nickname: "Host",
    });
    const guestSeat = await request(code, "join", {
      gameType,
      nickname: "Guest",
    });
    const host = await connect(hostSeat);
    const guest = await connect(guestSeat);
    if (status !== "lobby") {
      assert.equal((await send(host, "ready", { ready: true })).type, "ack");
      assert.equal((await send(guest, "ready", { ready: true })).type, "ack");
      await until(() => host.state.players.every((player) => player.ready));
      assert.equal((await send(host, "start")).type, "ack");
      await until(
        () =>
          host.state.status === "playing" && guest.state.status === "playing",
      );
      if (status === "finished") {
        assert.equal((await send(host, "end")).type, "ack");
        await until(
          () =>
            host.state.status === "finished" &&
            guest.state.status === "finished",
        );
      }
    }
    assert.equal((await send(guest, "dissolve")).error, "HOST_ONLY");
    assert.equal(
      (await send(host, "dissolve", { stage: host.state.stage - 1 })).error,
      "STALE",
    );
    assert.equal((await request(code, "inspect")).room.status, status);
    const spareTicket = await request(code, "connect", {
      token: guestSeat.token,
    });
    const closed = [host, guest].map(
      (client) =>
        new Promise((resolve) => {
          client.ws.addEventListener("close", (event) => resolve(event.code), {
            once: true,
          });
        }),
    );
    assert.equal((await send(host, "dissolve")).type, "ack");
    assert.deepEqual(await Promise.all(closed), [4005, 4005]);
    for (const client of [host, guest])
      assert.ok(
        client.messages.some(
          (item) => item.type === "closed" && item.reason === "DISSOLVED",
        ),
      );
    assert.deepEqual(await request(code, "inspect"), {
      room: null,
      alarm: null,
      tables: [],
    });
    assert.equal(
      (await request(code, "join", { gameType, nickname: "Late" })).error,
      "NOT_FOUND",
    );
    assert.equal(
      (await request(code, "connect", { token: guestSeat.token })).error,
      "NOT_FOUND",
    );
    const oldSocket = await mf.dispatchFetch(
      `http://localhost/socket?code=${code}`,
      {
        headers: {
          Upgrade: "websocket",
          "Sec-WebSocket-Protocol": `games,ticket-${spareTicket.ticket}`,
        },
      },
    );
    assert.equal(oldSocket.status, 404);
    await mf.unsafeEvictDurableObject("room-dissolution", "TestedRoom", {
      name: `room:${code}`,
    });
    assert.equal((await request(code, "inspect")).room, null);
    // Reusing the object cannot recover any old credentials or game progress.
    const fresh = await request(code, "create", {
      gameType,
      nickname: "New host",
    });
    assert.notEqual(fresh.token, hostSeat.token);
    assert.equal(
      (await request(code, "connect", { token: hostSeat.token })).error,
      "UNAUTHORIZED",
    );
    const newHost = await connect(fresh);
    assert.equal((await send(newHost, "dissolve")).type, "ack");
    await until(() => newHost.messages.some((item) => item.type === "closed"));
    assert.deepEqual(await request(code, "inspect"), {
      room: null,
      alarm: null,
      tables: [],
    });
  }
  console.log(
    "Room dissolution: host permissions, stale commands, lobby/playing/finished, storage/alarm deletion, closed sockets, expired credentials and recreation passed.",
  );
} finally {
  for (const ws of sockets) {
    try {
      ws.close(1000);
    } catch {
      /* Already closed. */
    }
  }
  await mf.dispose();
}
