import {
  TEST_SECTIONS,
  TEST_SECTION_COMPONENTS,
} from "@/constants/test-sections";
import { MARKDOWN_SAMPLES } from "@/views/test/markdown-samples";
const localeGroups = ["blog", "novel", "reader"];

export const testRoutes = [
  {
    path: "/test",
    name: "test",
    component: () => import("@/views/Test.vue"),
    meta: { title: "测试 | 远方之森", localeGroups },
  },
  ...TEST_SECTIONS.map((section) => ({
    path: `/test/${section.id}`,
    name: section.id,
    component: TEST_SECTION_COMPONENTS[section.id],
    meta: {
      title: `${section.title}测试 | 远方之森`,
      navName: "test",
      localeGroups,
    },
  })),
  ...MARKDOWN_SAMPLES.map(({ slug, name }) => ({
    path: `/test/markdown/${slug}`,
    name: slug,
    component: TEST_SECTION_COMPONENTS.markdown,
    meta: {
      title: `${name} | Markdown 测试`,
      navName: "test",
      localeGroups,
    },
  })),
];
