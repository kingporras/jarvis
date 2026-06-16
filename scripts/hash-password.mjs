import { pbkdf2Sync, randomBytes } from "node:crypto";

const ITERATIONS = 310000;
const KEY_LENGTH = 32;

async function readHiddenLine(prompt) {
  if (!process.stdin.isTTY) {
    const chunks = [];

    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks).toString("utf8").trimEnd();
  }

  return new Promise((resolve) => {
    const stdin = process.stdin;
    const previousRawMode = stdin.isRaw;
    let value = "";

    process.stdout.write(prompt);
    stdin.setEncoding("utf8");
    stdin.setRawMode(true);
    stdin.resume();

    function cleanup() {
      stdin.setRawMode(Boolean(previousRawMode));
      stdin.pause();
      stdin.off("data", handleData);
      process.stdout.write("\n");
    }

    function handleData(chunk) {
      for (const char of chunk) {
        if (char === "\u0003") {
          cleanup();
          process.exit(130);
        }

        if (char === "\r" || char === "\n") {
          cleanup();
          resolve(value);
          return;
        }

        if (char === "\b" || char === "\u007f") {
          value = value.slice(0, -1);
          continue;
        }

        value += char;
      }
    }

    stdin.on("data", handleData);
  });
}

const password = await readHiddenLine("Password: ");

if (!password) {
  console.error("Password is required.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha256");

console.log(`pbkdf2_sha256$${ITERATIONS}$${salt.toString("base64")}$${hash.toString("base64")}`);
