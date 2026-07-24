import * as fs from "fs";

type Token = { type: "number"; value: number } | { type: "identifier"; value: string } | { type: "string"; value: string } | { type: "operator"; value: string } | { type: "paren"; value: "(" | ")" };

function tokenize(expression: string): Token[] {
    const tokens: Token[] = [];
    let index = 0;

    while (index < expression.length) {
        const char = expression[index];

        if (char === undefined) {
            break;
        }

        if (/\s/.test(char)) {
            index += 1;
            continue;
        }

        if (char === "(" || char === ")") {
            tokens.push({ type: "paren", value: char });
            index += 1;
            continue;
        }

        if (char === '"' || char === "'") {
            const quote = char;
            let value = "";
            index += 1;

            while (index < expression.length && expression[index] !== quote) {
                value += expression[index];
                index += 1;
            }

            if (index >= expression.length) {
                throw new Error("Cadena sin cerrar");
            }

            tokens.push({ type: "string", value });
            index += 1;
            continue;
        }

        if (/\d|\./.test(char)) {
            let numberText = "";
            while (index < expression.length) {
                const nextChar = expression[index];
                if (nextChar === undefined || !/\d|\./.test(nextChar)) {
                    break;
                }
                numberText += nextChar;
                index += 1;
            }
            tokens.push({ type: "number", value: Number(numberText) });
            continue;
        }

        if (/[A-Za-z_]/.test(char)) {
            let text = "";
            while (index < expression.length) {
                const nextChar = expression[index];
                if (nextChar === undefined || !/[A-Za-z0-9_]/.test(nextChar)) {
                    break;
                }
                text += nextChar;
                index += 1;
            }
            tokens.push({ type: "identifier", value: text });
            continue;
        }

        const operator = expression.slice(index, index + 2);
        if (operator === "==" || operator === "!=" || operator === ">=" || operator === "<=") {
            tokens.push({ type: "operator", value: operator });
            index += 2;
            continue;
        }

        if (char === ">" || char === "<" || char === "+" || char === "-" || char === "*" || char === "/") {
            tokens.push({ type: "operator", value: char });
            index += 1;
            continue;
        }

        throw new Error(`Operador no soportado: ${char}`);
    }

    return tokens;
}

class ExpressionParser {
    private tokens: Token[];
    private index = 0;
    private variables: Map<string, string>;

    constructor(tokens: Token[], variables: Map<string, string>) {
        this.tokens = tokens;
        this.variables = variables;
    }

    private current(): Token | undefined {
        return this.tokens[this.index];
    }

    private advance(): Token | undefined {
        const token = this.current();
        this.index += 1;
        return token;
    }

    private peek(): Token | undefined {
        return this.tokens[this.index + 1];
    }

    public parse(): string {
        const result = this.parseComparison();
        return this.toString(result);
    }

    private parseComparison(): string | number | boolean {
        let left = this.parseAdditive();

        while (this.current()?.type === "operator" && (this.current()?.value === "==" || this.current()?.value === "!=" || this.current()?.value === ">" || this.current()?.value === "<" || this.current()?.value === ">=" || this.current()?.value === "<=")) {
            const operator = this.advance() as Token;
            const right = this.parseAdditive();
            const leftValue = this.toComparable(left);
            const rightValue = this.toComparable(right);

            switch (operator.value) {
                case "==":
                    left = leftValue === rightValue;
                    break;
                case "!=":
                    left = leftValue !== rightValue;
                    break;
                case ">":
                    left = leftValue > rightValue;
                    break;
                case "<":
                    left = leftValue < rightValue;
                    break;
                case ">=":
                    left = leftValue >= rightValue;
                    break;
                case "<=":
                    left = leftValue <= rightValue;
                    break;
                default:
                    left = false;
            }
        }

        return left;
    }

    private parseAdditive(): string | number | boolean {
        let left = this.parseMultiplicative();

        while (this.current()?.type === "operator" && (this.current()?.value === "+" || this.current()?.value === "-")) {
            const operator = this.advance() as Token;
            const right = this.parseMultiplicative();
            const leftValue = this.toNumber(left);
            const rightValue = this.toNumber(right);

            if (operator.value === "+") {
                left = leftValue + rightValue;
            } else {
                left = leftValue - rightValue;
            }
        }

        return left;
    }

    private parseMultiplicative(): string | number | boolean {
        let left = this.parseUnary();

        while (this.current()?.type === "operator" && (this.current()?.value === "*" || this.current()?.value === "/")) {
            const operator = this.advance() as Token;
            const right = this.parseUnary();
            const leftValue = this.toNumber(left);
            const rightValue = this.toNumber(right);

            if (operator.value === "*") {
                left = leftValue * rightValue;
            } else {
                left = rightValue === 0 ? "Error: división entre cero" : leftValue / rightValue;
            }
        }

        return left;
    }

    private parseUnary(): string | number | boolean {
        if (this.current()?.type === "operator" && this.current()?.value === "-") {
            this.advance();
            return -this.toNumber(this.parseUnary());
        }

        return this.parsePrimary();
    }

    private parsePrimary(): string | number | boolean {
        const token = this.advance();

        if (!token) {
            return "";
        }

        if (token.type === "number") {
            return token.value;
        }

        if (token.type === "string") {
            return token.value;
        }

        if (token.type === "identifier") {
            return this.variables.has(token.value) ? (this.variables.get(token.value) ?? "") : token.value;
        }

        if (token.type === "paren" && token.value === "(") {
            const inner = this.parseComparison();
            if (this.current()?.type === "paren" && this.current()?.value === ")") {
                this.advance();
                return inner;
            }
            throw new Error("Paréntesis sin cerrar");
        }

        throw new Error("Expresión inválida");
    }

    private toNumber(value: string | number | boolean): number {
        if (typeof value === "number") {
            return value;
        }

        if (typeof value === "boolean") {
            return value ? 1 : 0;
        }

        const trimmed = value.trim();
        const parsed = Number(trimmed);
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    private toComparable(value: string | number | boolean): string | number | boolean {
        if (typeof value === "number" || typeof value === "boolean") {
            return value;
        }

        const trimmed = value.trim();
        const parsed = Number(trimmed);
        return Number.isNaN(parsed) ? trimmed : parsed;
    }

    private toString(value: string | number | boolean): string {
        if (typeof value === "boolean") {
            return value ? "true" : "false";
        }
        if (typeof value === "number") {
            return String(value);
        }
        return value;
    }
}

function evaluateExpression(expression: string, variables: Map<string, string>): string {
    const value = expression.trim();

    if (!value) {
        return "";
    }

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }

    const tokens = tokenize(value);
    if (tokens.length === 0) {
        return "";
    }

    const parser = new ExpressionParser(tokens, variables);
    const result = parser.parse();

    if (result === "") {
        return value;
    }

    if (variables.has(value)) {
        return variables.get(value) ?? "";
    }

    return result;
}

function parseValue(rawValue: string, variables: Map<string, string>): string {
    return evaluateExpression(rawValue, variables);
}

function readScriptFile(filePath?: string): string {
    if (!filePath) {
        throw new Error("Uso: cds archivo.cds");
    }

    if (!fs.existsSync(filePath)) {
        throw new Error(`No se encontró el archivo: ${filePath}`);
    }

    return fs.readFileSync(filePath, "utf-8");
}

function runCodeScript(code: string) {
    const lines = code.split(/\r?\n/);
    const variables = new Map<string, string>();
    let inIfBlock = false;
    let skipBlock = false;
    let elseSeen = false;
    let conditionMet = false;

    for (let index = 0; index < lines.length; index += 1) {
        const rawLine = lines[index] ?? "";
        const line = rawLine.trim();

        if (!line || line.startsWith("//")) {
            continue;
        }

        const commentIndex = line.indexOf("//");
        const command = commentIndex >= 0 ? line.slice(0, commentIndex).trim() : line;

        if (!command) {
            continue;
        }

        if (command === "Else") {
            if (!inIfBlock) {
                console.warn(`Línea ${index + 1}: Else sin If previo.`);
                continue;
            }

            if (!elseSeen) {
                skipBlock = conditionMet;
                elseSeen = true;
            }

            continue;
        }

        if (command.startsWith("let ")) {
            if (inIfBlock && skipBlock) {
                continue;
            }

            const declaration = command.slice(4).trim();
            const separatorIndex = declaration.indexOf("=");

            if (separatorIndex === -1) {
                console.warn(`Línea ${index + 1}: declaración inválida: ${command}`);
                continue;
            }

            const name = declaration.slice(0, separatorIndex).trim();
            const value = declaration.slice(separatorIndex + 1).trim();

            if (!name) {
                console.warn(`Línea ${index + 1}: falta el nombre de la variable.`);
                continue;
            }

            variables.set(name, parseValue(value, variables));
            continue;
        }

        if (command.startsWith("Output(")) {
            if (inIfBlock && skipBlock) {
                continue;
            }

            const value = command.slice("Output(".length, -1).trim();
            console.log(parseValue(value, variables));
            continue;
        }

        if (command.startsWith("If(")) {
            const value = command.slice("If(".length, -1).trim();
            const resolvedValue = parseValue(value, variables);
            conditionMet = resolvedValue === "true";
            inIfBlock = true;
            elseSeen = false;
            skipBlock = !conditionMet;
            continue;
        }

        if (command.startsWith("EndIf")) {
            inIfBlock = false;
            skipBlock = false;
            elseSeen = false;
            continue;
        }

        if (inIfBlock && skipBlock) {
            continue;
        }

        console.warn(`Línea ${index + 1}: comando no reconocido: ${command}`);
    }
}

function main() {
    const args = process.argv.slice(2);
    const file = args[0];

    if (args.includes("--help") || args.includes("-h")) {
        console.log("Uso: cds archivo.cds");
        process.exit(0);
    }

    try {
        const code = readScriptFile(file);
        runCodeScript(code);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(message);
        process.exit(1);
    }
}

main();
