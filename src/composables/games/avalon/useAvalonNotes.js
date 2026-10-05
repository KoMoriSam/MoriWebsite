import { ref, watch } from "vue";
import {
  possibleMarks,
  validNotes,
  notesKey,
  readNotes,
  writeNotes,
} from "@/games/avalon/notes";

export function useAvalonNotes(room) {
  const marks = ref({});
  const storage = () => {
    try {
      return typeof window === "undefined" ? null : window.localStorage;
    } catch {
      return null;
    }
  };
  let loadedContext = "";
  watch(
    [
      () => room.value.code,
      () => room.value.selfId,
      () => room.value.game,
      () => room.value.phase,
      () => room.value.self,
      () => room.value.publicRoles,
      () => room.value.questIndex,
      () => room.value.recruitedId,
      () => room.value.history,
    ],
    () => {
      const current = room.value;
      const context = `${notesKey(current)}:${current.game}`;
      if (current.phase === "finished") {
        marks.value = {};
        writeNotes(storage(), current, {});
      } else if (loadedContext !== context)
        marks.value = readNotes(storage(), current);
      else {
        const next = validNotes(current, marks.value);
        if (Object.keys(next).length !== Object.keys(marks.value).length) {
          marks.value = next;
          writeNotes(storage(), current, next);
        }
      }
      loadedContext = context;
    },
    { immediate: true, flush: "sync" },
  );
  function markPlayer(id, mark) {
    const current = room.value;
    if (
      current.phase === "finished" ||
      id === current.selfId ||
      !current.players.some((player) => player.id === id) ||
      (mark && !possibleMarks(current, id).includes(mark))
    )
      return;
    const next = { ...marks.value };
    if (mark) next[id] = mark;
    else delete next[id];
    marks.value = next;
    writeNotes(storage(), current, next);
  }
  return { marks, markPlayer };
}
