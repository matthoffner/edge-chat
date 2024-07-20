import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'edge';

export async function POST(req: Request) {
    const { messages, data } = await req.json();
    const vectorStoreResultsString = data.vectorStoreResults;

    const previousMessages = messages.slice(0, -1).map((message: any) => {
        return message.role === "user" ? `User: ${message.content}\n` : `Assistant: ${message.content}\n`;
    }).join("");
    const lastMessage = messages[messages.length - 1]?.content || 'No message found';

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        stream: true,
        messages: [
          {
            role: "system",
            content:
              "Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format.",
          },
          {
            role: "user",
            content: `Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format. \nIf you don't know the answer, just say that you don't know, don't try to make up an answer.
            \n----------------\n
            PREVIOUS CONVERSATION:
            ${previousMessages}
            \n----------------\n
            CONTEXT:
            ${vectorStoreResultsString}
            USER INPUT: ${lastMessage}`,
          },
        ],
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
}
  
