const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

const envContent = fs.readFileSync(".env.local", "utf8");
let key = "";
envContent.split("\n").forEach(line => {
    if (line.startsWith("GEMINI_API_KEY=")) {
        key = line.split("=")[1].replace(/"/g, "").trim();
    }
});

const genAI = new GoogleGenerativeAI(key);

async function testModel(modelName) {
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        await model.generateContent("hi");
        console.log("✅ SUCCESS:", modelName);
    } catch (e) {
        console.error("❌ ERROR:", modelName, "->", e.message.split('\n')[0]);
    }
}

async function run() {
    const modelsToTest = [
        "gemini-3.1-flash",
        "gemini-3.1-pro",
        "gemini-3.1-flash-002",
        "gemini-2.5-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-pro"
    ];
    for (const m of modelsToTest) {
        await testModel(m);
    }
}
run();
