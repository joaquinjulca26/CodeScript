import fs from "fs";

const file = process.argv[2];

if (!file) {
    console.log("Uso: cds archivo.cds");
    process.exit(1);
}

const code = fs.readFileSync(file, "utf-8");

function runCodeScript(code: string) {
    const lines = code.split("\n");

    // Variables
    const variables = new Map<string, string>();

    for (const line of lines) {
        const command = line.trim();

        // Declaración de variables
        if (command.startsWith("let ")) {
            const declaration = command.replace("let ", "");
            const parts = declaration.split("=");

            if (parts.length === 2) {
                const name = parts[0].trim();
                const value = parts[1].trim().replace(/"/g, "");

                variables.set(name, value);
            }

            continue;
        }

        // Output
        if (command.startsWith("Output(")) {
            const value = command
                .replace("Output(", "")
                .replace(")", "")
                .trim();

            if (variables.has(value)) {
                console.log(variables.get(value));
            } else {
                console.log(value.replace(/"/g,""));
            }

            continue;
        }

        // If
        if (command.startsWith("If(")) {
            const value = command
                .replace("If(", "")
                .replace(")", "")
                .trim();

            if (variables.has(value)) {
                console.log(`If: la variable '${value}' existe.`);
            } else {
                console.log(`If: la variable '${value}' no existe.`);
            }

            continue;
        }

        // Else
        if (command === "Else") {
            console.log("Else ejecutado.");
            continue;
        }
    }
}

runCodeScript(code);
