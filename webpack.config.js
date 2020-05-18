const path = require("path");
const fs = require("fs");
const TerserPlugin = require("terser-webpack-plugin");


function getConfig(env, argv) {
    let config = {
        mode: "development",
        entry: "./index.tsx",
        target: "web",
        externals: [
            {
                "child_process": "commonjs child_process"
            },
            /*
            function(context, request, callback) {
                if(request.includes("/db/") || request.includes("/server_only/")) {
                    callback(null, `Object.create(null)`);
                }
                else if(["fs", "typeorm", "pg"].includes(request)) {
                    callback(null, `Object.create(null)`);
                } else {
                    callback();
                }
            }
            */
        ],
        output: {
            path: path.resolve(__dirname, "dist"),
            filename: "[name].js",
            libraryTarget: "var"
        },
        devtool: (
            "inline-source-map"
        ),
        resolve: {
            extensions: [".ts", ".tsx", ".js"],
        },
        module: {
            rules: [
                {
                    // .ts, but NOT .d.ts
                    //test: /(([^d])|([^.]d)|(^d))\.tsx?$/, loader: "ts-loader",
                    // .ts and .d.ts . This should make changing .d.ts files less painful.
                    test: /.tsx?$/, loader: "ts-loader",
                },

                { test: /\.less$/, loader: "style-loader!css-loader!less-loader" },
            ]
        },
        resolveLoader: {
            modules: ["node_modules", "./loaders"]
        },
        plugins: [
            //new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)()
        ],
        /*
        optimization: {
            minimize: browser,
        },
        */
        // Supply the __filename and __dirname values.
        node: {
            __filename: true,
            __dirname: true,
        }
    };
    return config;
}

module.exports = getConfig;