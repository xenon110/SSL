const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

const envContent = fs.readFileSync(".env.local", "utf8");
let key = "";
envContent.split("\n").forEach(line => {
    if (line.startsWith("GEMINI_API_KEY=")) {
        key = line.split("=")[1].replace(/"/g, "").trim();
    }
});

async function run() {
    try {
        const genAI = new GoogleGenerativeAI(key);
        // We can list models using REST if the SDK doesn't expose it easily.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        console.log("List Models:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("List Error:", e.message);
    }
}
run();
