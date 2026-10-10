// Imported only by the SSR branch in main.js. Pagefind uses the same complete
// generated snapshot directly; browser routes import metadata only.
const snapshots = import.meta.glob("./ssg-data.generated.js", {
  eager: true,
  import: "default",
});

export default snapshots["./ssg-data.generated.js"] || {};
