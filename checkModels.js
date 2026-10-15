require("dotenv").config();

async function listModels() {
    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
        );

        const data = await res.json();

        console.log("🔥 AVAILABLE MODELS:\n");

        data.models.forEach(model => {
            console.log("Name:", model.name);
            console.log("Methods:", model.supportedGenerationMethods);
            console.log("----------------------");
        });

    } catch (err) {
        console.error("❌ ERROR:", err);
    }
}

listModels();