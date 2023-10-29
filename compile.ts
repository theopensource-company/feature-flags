// ex. scripts/build_npm.ts
import { build, emptyDir } from "https://deno.land/x/dnt@0.34.0/mod.ts";
import project from "./project.json" assert { type: "json" };

await emptyDir("./npm");

await build({
    entryPoints: [
        "./mod.ts",
        {
            name: "./react",
            path: "react.ts",
        },
        {
            name: "./vue",
            path: "vue.ts",
        },
    ],
    outDir: "./npm",
    shims: {
        // see JS docs for overview and more options
        deno: true,
    },
    package: {
        // package.json properties
        name: "@theopensource-company/feature-flags",
        version: project.version,
        description: "Abstraction of logic to handle feature flags",
        license: "Apache Licence 2.0",
        repository: {
            type: "git",
            url: "git+https://github.com/theopensource-company/feature-flags",
        },
        bugs: {
            url: "https://github.com/theopensource-company/feature-flags/issues",
        },
    },
    postBuild() {
        // steps to run after building and before running the tests
        Deno.copyFileSync("LICENSE", "npm/LICENSE");
        Deno.copyFileSync("README.md", "npm/README.md");
    },
});
