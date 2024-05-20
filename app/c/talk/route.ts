import { NextRequest } from "next/server";
import { talk } from "@/app/c/_actions/conversation";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const conversationId =
    parseInt(url.searchParams.get("conversationId") || "") || 1000;
  const text = url.searchParams.get("text") || "";
  const readableStream = new ReadableStream({
    start(controller) {
      // Function to push data to the client
      talk(
        conversationId,
        text,
        (message) => {
          const formattedMessage = `data: ${JSON.stringify(message)}\n\n`;
          controller.enqueue(new TextEncoder().encode(formattedMessage));
        },
        (order) => {
          const formattedMessage = `event: ${order.type}\ndata: ${JSON.stringify(order.content)}\n\n`;
          controller.enqueue(new TextEncoder().encode(formattedMessage));
        },
        () => {
          console.log('evernt stream closing')
          controller.close();
        }
      );
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
