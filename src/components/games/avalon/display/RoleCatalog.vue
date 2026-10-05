<template>
  <div class="min-w-0 space-y-6 overflow-x-clip">
    <section
      v-for="group in groups"
      :key="group.side"
      class="min-w-0 space-y-3"
    >
      <h3
        class="font-serif font-semibold"
        :class="group.side === 'good' ? 'text-success' : 'text-error'"
      >
        {{ t(`avalon.night.${group.side}`) }}
      </h3>
      <div class="grid grid-cols-2 gap-3 p-2 sm:gap-4">
        <article
          v-for="role in group.roles"
          :key="role"
          class="w-full min-w-0 max-w-xs justify-self-center"
        >
          <button
            type="button"
            class="block w-full cursor-pointer rounded-box focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            :aria-label="
              t('avalon.config.viewRole', { name: t(`avalon.roles.${role}`) })
            "
            @click="showRoleDetails(role)"
          >
            <IdentityCard
              :self="{ role, alignment: group.side, lancelotMode: mode }"
              self-id=""
              :player-name="emptyPlayerName"
              face-up
              preview
              catalog
              compact
            />
          </button>
        </article>
      </div>
    </section>
    <section class="min-w-0 space-y-3">
      <h3 class="font-serif font-semibold">{{ t("avalon.lady.skills") }}</h3>
      <div class="grid grid-cols-2 gap-3 p-2 sm:gap-4">
        <article
          v-for="(card, skill) in SKILL_CARDS"
          :key="skill"
          class="w-full min-w-0 max-w-xs justify-self-center"
        >
          <button
            type="button"
            class="block w-full cursor-pointer rounded-box focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            :aria-label="t('avalon.config.viewRole', { name: t(card.title) })"
            @click="showSkillDetails(skill)"
          >
            <SkillCard :skill="skill" compact />
          </button>
        </article>
      </div>
    </section>
    <RolePreviewPopover
      ref="rolePopover"
      :role="selectedRole"
      :skill="selectedSkill"
      :mode="mode"
      :alignment="selectedRole ? roleAlignment(selectedRole) : undefined"
    />
    <SpecialRules catalog :mode="mode" />
  </div>
</template>
<script setup>
import { ref } from "vue";
import { useLocale } from "@/i18n";
import {
  ROLES,
  roleAlignment,
} from "../../../../../shared/games/avalon/index.js";
import IdentityCard from "./IdentityCard.vue";
import SkillCard from "./SkillCard.vue";
import { SKILL_CARDS } from "@/games/avalon/presentation";
import SpecialRules from "./SpecialRules.vue";
import RolePreviewPopover from "../interaction/RolePreviewPopover.vue";
defineProps({ mode: { type: String, default: "fixed" } });
const { t } = useLocale();
const groups = ["good", "evil"].map((side) => ({
  side,
  roles: ROLES.filter((role) => roleAlignment(role) === side),
}));
const emptyPlayerName = () => "";
const selectedRole = ref(null);
const selectedSkill = ref(null);
const rolePopover = ref(null);
function showRoleDetails(role) {
  selectedSkill.value = null;
  selectedRole.value = role;
  void rolePopover.value?.open();
}
function showSkillDetails(skill) {
  selectedRole.value = null;
  selectedSkill.value = skill;
  void rolePopover.value?.open();
}
</script>
