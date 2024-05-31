import { NextRequest } from "next/server";
import { talk } from "./talkToAllDialog";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const conversationId = parseInt(url.searchParams.get("conversationId") || "");
  const dialogId = parseInt(url.searchParams.get("dialogId") || "");
  const text = url.searchParams.get("text") || "";
  const readableStream = new ReadableStream({
    async start(controller) {
      // Function to push data to the client
      try {
        await talk(
          conversationId,
          text,
          dialogId,
          (message) => {
            const formattedMessage = `data: ${JSON.stringify(message)}\n\n`;
            controller.enqueue(new TextEncoder().encode(formattedMessage));
          },
          (order) => {
            const formattedMessage = `event: ${
              order.type
            }\ndata: ${JSON.stringify(order.content)}\n\n`;
            controller.enqueue(new TextEncoder().encode(formattedMessage));
          }
        );
      } catch (e) {
        console.error(e);
      }

      controller.enqueue(new TextEncoder().encode(`event: close\ndata: \n\n`));
      controller.close();
    },
  });

  const response = new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });

  return response;
}
