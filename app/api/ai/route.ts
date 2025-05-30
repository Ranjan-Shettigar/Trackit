import { GoogleGenerativeAI } from "@google/generative-ai";
import { PocketBaseMCP } from "@/lib/pocketbase-mcp";

export async function POST(req: Request) {
  try {
    const { prompt, userId, authToken } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured" }),
        { status: 500 }
      );
    }

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
      });
    }

    // Initialize PocketBase MCP with user context
    const mcpService = new PocketBaseMCP(
      process.env.POCKETBASE_URL || "https://trackit.pockethost.io/"
    );
    mcpService.setCurrentUser(userId, authToken);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

    // Enhanced prompt with MCP tool capabilities
    const availableTools = mcpService.getAvailableTools();

    const chatPrompt = `
You are a conciseand on point, helpful AI assistant called Quanta for analyzing financial transactions with access to powerful database tools.

Available tools for data analysis:
${JSON.stringify(
  availableTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
  })),
  null,
  2
)}

User question: ${prompt}

Instructions:
1. Always ensure data security - you can only access data belonging to the authenticated user.
2. Keep your responses concise and to the point in a few words.

Respond with analysis. If you need to call a tool, format it EXACTLY as:
TOOL_CALL: {"toolName": "tool_name", "arguments": {"key1": "value1", "key2": "value2"}}
Ensure the JSON for TOOL_CALL is valid, with all keys and string values enclosed in double quotes.`;
    const result = await model.generateContent(chatPrompt);
    const response = await result.response;
    let text = response.text();

    // Check if the AI wants to use a tool
    if (text.includes("TOOL_CALL:")) {
      try {
        const toolCallMatch = text.match(/TOOL_CALL:\s*(\{[\s\S]*\})/); // Replaced . with [\s\S] and removed s flag
        if (toolCallMatch && toolCallMatch[1]) {
          const toolCallJSON = toolCallMatch[1];
          console.log("Extracted TOOL_CALL JSON:", toolCallJSON);
          const toolCallRaw = JSON.parse(toolCallJSON);
          // Convert toolName to name for MCP
          const mcpToolCall = {
            name: toolCallRaw.toolName,
            arguments: toolCallRaw.arguments,
          };
          // Execute the tool
          const toolResult = await mcpService.executeTool(mcpToolCall);
          console.log("Raw tool execution result:", toolResult);
          const toolData = JSON.parse(toolResult.content[0].text);
          console.log("Parsed toolData:", toolData);

          // Generate a new response with the tool data
          const followUpPrompt = `Based on the user's question: "${prompt}"

Here's the data I retrieved:
${JSON.stringify(toolData, null, 2)}

Please provide a concise answer to the user's question based on this data. Make it human-readable and actionable.`;

          const followUpResult = await model.generateContent(followUpPrompt);
          const followUpResponse = await followUpResult.response;
          text = followUpResponse.text();
        }
      } catch (toolError) {
        console.error("Tool execution error:", toolError);
        text += `\n\nNote: I encountered an error while trying to fetch your data: ${
          toolError instanceof Error ? toolError.message : String(toolError)
        }`;
      }
    }

    return new Response(JSON.stringify({ response: text }), { status: 200 });
  } catch (error: unknown) {
    console.error("Error in AI API:", error);
    let errorMessage = "Failed to process AI request";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
    });
  }
}
