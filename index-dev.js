require("dotenv").config();

const tsConfig = require('./tsconfig.json');
require("tsconfig-paths").register({
  baseUrl: ".",
  paths: tsConfig.compilerOptions.paths,
});

require("./scripts/dev-server");
