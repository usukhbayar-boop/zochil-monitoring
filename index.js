require("dotenv").config();
if(!process.env.SERVICE_NAME) {
  throw new Error("SERVICE_NAME enviroment variable not defined");
}

const tsConfig = require('./tsconfig.json');
require("tsconfig-paths").register({
  baseUrl: ".",
  paths: tsConfig.compilerOptions.paths,
});

const API_SERVER_PATH = `./api/${process.env.SERVICE_NAME}-api/server`;
require(API_SERVER_PATH);
