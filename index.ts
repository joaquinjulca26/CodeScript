import * as fs from "fs";

const file = process.argv[2];

if (!file) {
    console.log("Uso: cds archivo.cds");
    process.exit(1);
}

const code = fs.readFileSync(file, "utf-8");

function runCodeScript(code: string) {
    const lines = code.split("\n");

    for (const line of lines) {
        const command = line.trim();

        if (command.startsWith("Output(")) {
            const text = command
                .replace("Output(", "")
                .replace(")", "")
                .replace(/"/g, "");

            console.log(text);
        }
    }
}

runCodeScript(code);