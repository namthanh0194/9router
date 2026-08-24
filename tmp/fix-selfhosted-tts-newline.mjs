import fs from "node:fs";

const path = "src/app/api/providers/[id]/test/testUtils.js";
let source = fs.readFileSync(path, "utf8");
const broken = 'switch (connection.provider) {      case "selfhosted-tts": {';
const fixed = 'switch (connection.provider) {\n      case "selfhosted-tts": {';
if (!source.includes(broken)) throw new Error("broken switch line not found");
source = source.replace(broken, fixed);
fs.writeFileSync(path, source, "utf8");