import { readFile, writeFile } from "node:fs/promises";
const extractMongoSchema = require("extract-mongo-schema");

async function main() {
    // let data = await extractMongoSchema.extractMongoSchema("mongodb://192.168.1.13:27017/EVESDE", {
    //     authSource: "",
    //     collectionList: [],
    //     arrayList: [],
    //     raw: false,
    //     limit: 50,
    //     dontFollowFK: [],
    //     includeSystem: false
    //     });
    //
    const outputFolder = "/mnt/c/Users/Arron/Documents/GitHub/evesde.dev/src";
    const generatedControllers: string[] = [];
    const templates: { name: string; path: string; template: string }[] = [
        {
            name: "model",
            path: `${outputFolder}/models/sde`,
            template: (
                await readFile("./templates/model.template.txt")
            ).toString(),
        },
        {
            name: "controller",
            path: `${outputFolder}/controllers/sde`,
            template: (
                await readFile("./templates/controller.template.txt")
            ).toString(),
        },
    ];

    const data: {
        [key: string]: {
            [key: string]: {
                type: string;
                required: boolean;
                primaryKey: boolean;
            };
        };
    } = require("/mnt/c/Users/Arron/Documents/GitHub/evesde.dev/sde_scheme.json"); //JSON.parse(process.argv[2]);

    for (const [objectName, properties] of Object.entries(data)) {
        const props: {
            deff: string;
            init: string;
            schema: string;
            name: string;
        }[] = Object.entries(properties).map(([propName, propValue]) => {
            let deff = `public ${propName}: ${propValue.type}`;
            let init = "";
            let schema = `${propName}: {type: "${propValue.type}"}`;

            switch (propValue.type) {
                case "number":
                    deff += " = 0;";
                    init = `if(json.[PROPERTY] === undefined) throw new Error("[PROPERTY] is required for [OBJECTNAME]")\n\t\telse this.[PROPERTY] = json.[PROPERTY]\n`;
                    break;
                case "string":
                    deff += ' = "";';
                    init = `if(json.[PROPERTY] === undefined) throw new Error("[PROPERTY] is required for [OBJECTNAME]")\n\t\telse this.[PROPERTY] = json.[PROPERTY]\n`;
                    break;
            }

            init = init
                .replaceAll("[PROPERTY]", propName)
                .replaceAll("[OBJECTNAME]", objectName);

            return { deff, init, schema, name: propName };
        });

        for (const template of templates) {
            generatedControllers.push(objectName);
            await writeFile(
                `${template.path}/${objectName}.${template.name}.ts`,
                template.template
                    .replaceAll("[OBJECTNAME]", objectName)
                    .replaceAll("[OBJECTNAME_LOWER]", objectName.toLowerCase())
                    .replaceAll("[OBJECTNAME_UPPER]", objectName.toUpperCase())
                    .replaceAll(
                        "[PROPERTIES]",
                        props.map((p) => p.deff).join("\n\t")
                    )
                    .replaceAll(
                        "[INITS]",
                        props.map((p) => p.init).join("\n\t\t")
                    )
                    .replaceAll(
                        "[SCHEMAS]",
                        props.map((p) => p.schema).join(",\n\t\t\t\t\t\t")
                    )
                    .replaceAll(
                        "[IDFIELD]",
                        props.find(
                            (p) =>
                                p.name.toLowerCase() ===
                                objectName
                                    .substring(3, objectName.length - 1)
                                    .toLowerCase() +
                                    "id"
                        )?.name ?? ""
                    ),
                { flag: "w" }
            );
        }

        //console.log(path.join(outputFolder, `${objectName}.model.ts`), file);
    }

    await writeFile(
        `${outputFolder}/controllers/sde/index.ts`,
        generatedControllers
            .map((a) => `export * from './${a}.controller'`)
            .join("\n"),
        { flag: "w" }
    );
}
main();
