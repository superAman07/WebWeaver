import Groq from "groq-sdk";
import * as dotenv from "dotenv";
import express, { Request, response, Response} from "express";
import { BASE_PROMPT, getSystemPrompt } from "./prompts.js";
import { basePrompt as nodeBasePrompt } from "./defaults/node.js";
import { basePrompt as reactBasePrompt } from "./defaults/react.js";
import cors from "cors";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

if (!process.env.GROQ_API_KEY) {
  throw new Error("Groq API key is missing. Please check your .env file.");
}

async function getPrediction(messages: any[], systemPrompt?: string) {
  console.log("Making request to Groq API...");
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        ...messages
      ],
      model: process.env.MODEL_API as "gemma-7b-it" | "llama3-70b-8192" | "llama3-8b-8192" | "mixtral-8x7b-32768"
    });

    return chatCompletion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error(
      "Error from Groq API:",
      error instanceof Error ? error.message : String(error)
    );
    throw new Error("Error processing the request");
  }
}

app.post("/template", async (req: Request, res: Response): Promise<void> => {
  const { prompt } = req.body;

  try {
    const response = await getPrediction(
      [{ role: "user", content: prompt }],
      "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra"
    );

    const answer = response.trim().toLowerCase();

    if (answer === "react") {
      res.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [reactBasePrompt],
      });
      return;
    }

    if (answer === "node") {
      res.json({
        prompts: [
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [nodeBasePrompt],
      });
      return;
    }

    res.json({ message: "You can't access this" });
  } catch (error) {
    console.error("Error processing template request:", error);
    res.json({ message: "Error processing the request" });
  }
});

app.post("/chat", async (req: Request, res: Response): Promise<void> => {
  const { messages } = req.body;

  if (!messages || messages.length === 0) {
    res.json({ message: "Messages are required" });
    return;
  }

  try {
    const result = await getPrediction(messages, getSystemPrompt());
    console.log("API Response:", result);

    res.json({
      response: result,
    });
  } catch (error) {
    console.error("Error connecting to the API:", error);
    res.json({ message: "Error processing the request" });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
