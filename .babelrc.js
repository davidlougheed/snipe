module.exports = {
  "presets": [
    ["@babel/preset-env", {
      "modules": false
    }],
    ["@babel/preset-react", {
      runtime: "automatic",
      development: process.env.NODE_ENV === "development"
    }],
  ],
  "plugins": [
    "@babel/syntax-dynamic-import",
    ["import", {
      "libraryName": "antd",
      "style": true,
    }],
  ],
};
