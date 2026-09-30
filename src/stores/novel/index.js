import { defineStore } from "pinia";
import { useNovelState } from "./state";
import { useNovelGetters } from "./getters";
import { useNovelActions } from "./actions";

export const useNovelStore = defineStore("novel", () => {
  const state = useNovelState();
  const getters = useNovelGetters(state);
  const actions = useNovelActions(state, getters);

  return {
    // State
    ...state,

    // Getters
    ...getters,

    // Actions
    ...actions,
  };
});
