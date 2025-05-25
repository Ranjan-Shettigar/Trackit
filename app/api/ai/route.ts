import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { prompt, transactions } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }), { status: 500 });
    }

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b"});

    const chatPrompt = `You are a helpful AI assistant for analyzing financial transactions.
    The user will provide their transactions and ask questions about them.
    Here are the user's transactions:
    ${JSON.stringify(transactions, null, 2)}

    User question: ${prompt}

    Provide a concise and helpful answer based on the transaction data.`;

    const result = await model.generateContent(chatPrompt);
    const response = await result.response;
    const text = response.text();

    return new Response(JSON.stringify({ response: text }), { status: 200 });

  } catch (error: unknown) {
    console.error('Error in AI API:', error);
    let errorMessage = 'Failed to process AI request';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
