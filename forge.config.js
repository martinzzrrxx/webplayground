const { VitePlugin } = require("@electron-forge/plugin-vite");
const { MakerSquirrel } = require("@electron-forge/maker-squirrel");
const { MakerZIP } = require("@electron-forge/maker-zip");

module.exports = {
  packagerConfig: {
    asar: true,
    executableName: "WebStudyLab"
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ["win32"])
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main.js",
          config: "vite.main.config.mjs"
        },
        {
          entry: "src/preload.js",
          config: "vite.preload.config.mjs"
        }
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.mjs"
        }
      ]
    })
  ]
};

