const { GoogleGenerativeAI } = require("@google/generative-ai");

async function run() {
    try {
        const genAI = new GoogleGenerativeAI("");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        await model.generateContent("hi");
    } catch (e) {
        console.error("Empty key Error:", e.message);
    }
}
run();
