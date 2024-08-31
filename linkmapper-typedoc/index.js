import { ArgumentParser } from "argparse";
import { readFileSync } from "fs";
import { writeFile } from "fs/promises";
import path from "path";
import { Application, DefaultTheme, Deserializer, FileRegistry, ReflectionKind, Renderer, } from "typedoc";
async function main() {
    const p = new ArgumentParser({
        description: "Generates a Djockey link mapping file given a TypeDoc JSON file.",
    });
    p.add_argument("typedoc_json_file_path", {
        help: "Path to a TypeDoc JSON file, for example $YOUR_REPO/types.json",
    });
    p.add_argument("output_path", {
        help: "Where to save the output, for example $YOUR_REPO/docs/link_mapping.json",
    });
    const args = p.parse_args();
    const json = JSON.parse(readFileSync(path.resolve(args.typedoc_json_file_path), "utf8"));
    const result = await getURLs(json);
    const output = {
        version: 0,
        namespaces: ["typescript", "ts", "typedoc"],
        linkMappings: result,
    };
    await writeFile(args.output_path, JSON.stringify(output, null, "  "));
}
function getFullPath(model) {
    if (!model.parent || model.parent.kind === ReflectionKind.Project) {
        return model.name;
    }
    return `${getFullPath(model.parent)}.${model.name}`;
}
function getAliases(model) {
    if (model.kind === ReflectionKind.Project)
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
export async function getURLs(projectReflectionJSON) {
    const app = await Application.bootstrap();
    const registry = new FileRegistry();
    const proj = new Deserializer(app).reviveProject(projectReflectionJSON, "djockey-api", path.resolve("."), registry);
    const theme = new DefaultTheme(new Renderer(app));
    const urlMappings = theme.getUrls(proj);
    const urls = new Array();
    function visit(model) {
        if (model.url) {
            for (const alias of getAliases(model)) {
                urls.push({ linkDestination: alias, relativeURL: model.url });
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
await main();
//# sourceMappingURL=index.js.map