import {
  TEST_SECTIONS,
  TEST_SECTION_COMPONENTS,
} from "@/constants/test-sections";
import { MARKDOWN_SAMPLES } from "@/views/test/markdown-samples";

export const testRoutes = [
  {
    path: "/test",
    name: "test",
    component: () => import("@/views/Test.vue"),
    meta: { title: "测试 | 远方之森" },
  },
  ...TEST_SECTIONS.map((section) => ({
    path: `/test/${section.id}`,
    name: section.id,
    component: TEST_SECTION_COMPONENTS[section.id],
    meta: {
      title: `${section.title}测试 | 远方之森`,
      navName: "test",
    },
  })),
  ...MARKDOWN_SAMPLES.map(({ slug, name }) => ({
    path: `/test/markdown/${slug}`,
    name: slug,
    component: TEST_SECTION_COMPONENTS.markdown,
    meta: {
      title: `${name} | Markdown 测试`,
      navName: "test",
    },
  })),
];
