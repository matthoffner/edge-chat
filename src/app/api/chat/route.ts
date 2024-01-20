import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'edge';

export async function POST(req: Request) {
    const { messages, data } = await req.json();
    const vectorStoreResultsString = data.vectorStoreResults;

    const enhancedMessages = messages.concat({
        role: 'system',
        content: `Vector Store Results: ${vectorStoreResultsString}`
    });

    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        stream: true,
        messages: enhancedMessages,
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
}
  