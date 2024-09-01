#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getURLs = getURLs;
const argparse_1 = require("argparse");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const typedoc_1 = require("typedoc");
async function main() {
    const p = new argparse_1.ArgumentParser({
        description: "Generates a Djockey link mapping file given a TypeDoc JSON file.",
    });
    p.add_argument("typedoc_json_file_path", {
        help: "Path to a TypeDoc JSON file, for example $YOUR_REPO/types.json",
    });
    p.add_argument("output_path", {
        help: "Where to save the output, for example $YOUR_REPO/docs/link_mapping.json",
    });
    const args = p.parse_args();
    const json = JSON.parse((0, fs_1.readFileSync)(path_1.default.resolve(args.typedoc_json_file_path), "utf8"));
    const result = await getURLs(json);
    const output = {
        version: 0,
        namespaces: ["typescript", "ts", "typedoc"],
        linkMappings: result,
    };
    await (0, promises_1.writeFile)(args.output_path, JSON.stringify(output, null, "  "));
}
function getFullPath(model) {
    if (!model.parent || model.parent.kind === typedoc_1.ReflectionKind.Project) {
        return model.name;
    }
    return `${getFullPath(model.parent)}.${model.name}`;
}
function getAliases(model) {
    if (model.kind === typedoc_1.ReflectionKind.Project)
        return [];
    const path = getFullPath(model);
    const parts = path.split(".");
    const result = new Array();
    const isCommon = model.name === "constructor" && (!model.children || !model.children.length);
    const upperBound = isCommon ? parts.length - 1 : parts.length;
    for (let i = 0; i < upperBound; i++) {
        result.push(parts.slice(i).join("."));
    }
    return result;
}
async function getURLs(projectReflectionJSON) {
    const app = await typedoc_1.Application.bootstrap();
    const registry = new typedoc_1.FileRegistry();
    const proj = new typedoc_1.Deserializer(app).reviveProject(projectReflectionJSON, "djockey-api", path_1.default.resolve("."), registry);
    const theme = new typedoc_1.DefaultTheme(new typedoc_1.Renderer(app));
    const urlMappings = theme.getUrls(proj);
    const urls = new Array();
    const seenDestinationURLPairs = new Set();
    function visit(model) {
        if (model.url) {
            for (const alias of getAliases(model)) {
                const destURLPair = `${alias}:::${model.url}`;
                if (seenDestinationURLPairs.has(destURLPair))
                    continue;
                seenDestinationURLPairs.add(destURLPair);
                urls.push({
                    linkDestination: alias,
                    relativeURL: model.url,
                    defaultLabel: model.name,
                });
            }
        }
        if (model.children) {
            for (const child of model.children) {
                visit(child);
            }
        }
    }
    for (const mapping of urlMappings) {
        visit(mapping.model);
    }
    return urls;
}
main();
//# sourceMappingURL=index.js.map