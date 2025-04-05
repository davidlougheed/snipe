// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");

const isProduction = process.env.NODE_ENV === "production";


const config = {
    entry: "./src/index.tsx",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].[chunkhash:8].js",
        sourceMapFilename: "[name].[chunkhash:8].map",
        chunkFilename: "[name].[chunkhash:8].js",
        clean: true,
    },
    devServer: {
        open: true,
        host: 'localhost',
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'index.html',
        }),
        new CopyPlugin({
            patterns: [
                { from: "datasets/*", to: "[path][name][ext]" },
            ],
        }),
        new ForkTsCheckerWebpackPlugin(),
        new webpack.ProgressPlugin({
            activeModules: true,
            // showActiveModules: true // display the current module
        }),
    ],
    module: {
        rules: [
            {
                test: /\.(js|mjs)$/,
                enforce: "pre",
                use: ["source-map-loader"],
            },
            {
                test: /\.(ts|tsx|js|jsx)$/i,
                loader: 'ts-loader',
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
                type: 'asset',
            },

            // Add your rules for custom modules here
            // Learn more about loaders from https://webpack.js.org/loaders/
        ],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
            "@lib": path.resolve(__dirname, "src/lib"),
            "@shared": path.resolve(__dirname, "src/shared"),
        },
        extensions: ["*", ".ts", ".tsx", ".js", ".jsx"]
    },
    watchOptions: {
        ignored: /node_modules/,
    },
};

module.exports = () => {
    if (isProduction) {
        config.mode = 'production';
    } else {
        config.mode = 'development';
    }
    return config;
};
