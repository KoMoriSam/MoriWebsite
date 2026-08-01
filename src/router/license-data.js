const generatedDataModules = import.meta.glob("./license-data.generated.js", {
  eager: true,
  import: "default",
});

const licenseData = generatedDataModules["./license-data.generated.js"] || {
  projectLicense: "",
  noticesMarkdownEn: "",
  noticesMarkdownZh: "",
  dependencyCount: 0,
  missingLicenseFileCount: 0,
  dependencyNotices: [],
  supplementalLicenses: [],
};

export default licenseData;
