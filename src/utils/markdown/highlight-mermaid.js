export default function mermaid(hljs) {
  const DIAGRAM_DECLARATION = {
    scope: "keyword",
    match:
      /\b(?:architecture-beta|block-beta|classDiagram|C4Component|C4Container|C4Context|C4Deployment|erDiagram|flowchart|gantt|gitGraph|graph|journey|kanban|mindmap|packet-beta|pie|quadrantChart|requirementDiagram|sankey-beta|sequenceDiagram|stateDiagram(?:-v2)?|timeline|xychart-beta)\b/,
  };
  const DIRECTIVE = {
    scope: "meta",
    begin: /%%\{/,
    end: /\}%%/,
    contains: [hljs.QUOTE_STRING_MODE, hljs.APOS_STRING_MODE],
  };

  return {
    name: "Mermaid",
    aliases: ["mmd"],
    keywords: {
      keyword:
        "accDescr accTitle activate actor alt and as autonumber break call class classDef click critical deactivate direction else end href link linkStyle loop note of opt par participant rect section style subgraph title",
      literal: "false null true",
    },
    contains: [
      DIRECTIVE,
      hljs.COMMENT(/%%(?!\{)/, /$/),
      DIAGRAM_DECLARATION,
      hljs.QUOTE_STRING_MODE,
      hljs.APOS_STRING_MODE,
      {
        scope: "operator",
        match:
          /(?:<[-.=]+>|[-.=]+>|<[-.=]+|[-.=]{2,}|--\)|--x|--o|\|>|\}\||\|\{|\|o|o\||\|\|)/,
        relevance: 0,
      },
      {
        scope: "number",
        match: /\b\d+(?:\.\d+)?\b/,
        relevance: 0,
      },
    ],
  };
}
