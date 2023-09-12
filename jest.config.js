module.exports = {
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest"]
  },
  moduleNameMapper: {
    "^api/(.*)": "<rootDir>/api/$1",
    "^lib/(.*)": "<rootDir>/lib/$1",
    "^core/(.*)": "<rootDir>/api/@core/$1",
    "^resources/(.*)": "<rootDir>/resources/$1"
  }
};
