import { provide, shallowRef, watch } from "vue";
import {
  assignPlayerAvatarColors,
  avatarThemeColor,
  playerAvatarColorsKey,
} from "@/utils/auth/avatar-color";

export function usePlayerAvatarColors(room, code) {
  const colors = shallowRef(new Map());
  let assignments = new Map();
  let currentCode;
  watch(
    () => ({
      code: code.value,
      players: room.value?.players.map(({ id, nickname }) => ({ id, nickname })) || [],
    }),
    (state) => {
      if (state.code !== currentCode) assignments.clear();
      currentCode = state.code;
      assignments = assignPlayerAvatarColors(state.players, assignments);
      colors.value = new Map(state.players.map((player) => [
        player.nickname,
        avatarThemeColor(player.nickname, assignments.get(player.id)),
      ]));
    },
    { immediate: true },
  );
  provide(playerAvatarColorsKey, colors);
}
