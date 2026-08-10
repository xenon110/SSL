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

async function run() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("hi");
        console.log("gemini-1.5-flash Success");
    } catch (e) {
        console.error("gemini-1.5-flash Error:", e.message);
    }
    
    try {
        const model2 = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const result2 = await model2.generateContent("hi");
        console.log("gemini-1.5-flash-latest Success");
    } catch (e) {
        console.error("gemini-1.5-flash-latest Error:", e.message);
    }

    try {
        const model3 = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result3 = await model3.generateContent("hi");
        console.log("gemini-pro Success");
    } catch (e) {
        console.error("gemini-pro Error:", e.message);
    }
}
run();
