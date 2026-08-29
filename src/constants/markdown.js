const avatar = (name) => `/assets/images/avatar/${name}.webp`;

export const DEFAULT_AVATAR = avatar("default");

export const SELF_NAMES = new Set(["我", "小群主", "Mori", "KoMoriSam"]);

export const AVATAR_MAP = {
  "🈚️内👻，LG": avatar("lg"),

  小群主: avatar("komorisam"),
  Mori: avatar("komorisam"),
  KoMoriSam: avatar("komorisam"),

  真正群主: avatar("talloran"),
  牛子: avatar("niuzi"),
  欢乐豆人: avatar("joybean"),
  天天: avatar("smellycat7"),
  量子: avatar("quantum"),
  泡泡冰: avatar("paopao"),
  李焰老师: avatar("liyan"),
  赵天明老师: avatar("zhaotianming"),
  爸: avatar("dad"),
  妈: avatar("mom"),

  OpenAI: avatar("openai"),
  "GPT-5.6": avatar("openai"),
};

export const FOOTER_MAP = [
  ["已送达", "badge-info"],
  ["已读", "badge-success"],
  ["发送失败", "badge-error"],
  ["已删除", "badge-neutral"],
  ["已编辑", "badge-primary"],
  ["已转发", "badge-secondary"],
  ["已回复", "badge-accent"],
  ["已引用", "badge-info"],
  ["精华消息", "badge-secondary"],
  ["👍", "badge-success"],
  ["👎", "badge-error"],
  ["💬", "badge-info"],
  ["🔗", "badge-primary"],
  ["📎", "badge-secondary"],
  ["📷", "badge-accent"],
  ["🎥", "badge-warning"],
];
