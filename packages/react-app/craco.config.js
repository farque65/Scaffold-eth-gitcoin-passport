const { addBeforeLoader, loaderByName } = require("@craco/craco")

module.exports = {
  style: {
    postcss: {
      plugins: [require("tailwindcss"), require("autoprefixer")],
    },
  },
  webpack: {
    configure: webpackConfig => {
      const wasmExtensionRegExp = /\.wasm$/
      webpackConfig.resolve.extensions.push(".wasm")

      webpackConfig.module.rules.forEach(rule => {
        ;(rule.oneOf || []).forEach(oneOf => {
          if (oneOf.loader && oneOf.loader.indexOf("file-loader") >= 0) {
            oneOf.exclude.push(wasmExtensionRegExp)
          }
        })
      })

      const wasmLoader = {
        test: /\.wasm$/,
        exclude: /node_modules/,
        loaders: ["wasm-loader"],
      }

      addBeforeLoader(webpackConfig, loaderByName("file-loader"), wasmLoader)

      return webpackConfig
    },
  },
}
