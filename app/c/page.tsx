"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { createNewConversation } from "./_actions/conversation";
import { useRouter } from "next/navigation";

export default function Greeting() {
  const [message, setMessage] = useState("");
  const router = useRouter();

  const submit = useCallback(
    async (message: string) => {
      setMessage("");
      const conversation = await createNewConversation();
      const eventSource = new EventSource(
        `/c/talk?conversationId=${conversation.id}&text=${encodeURIComponent(
          message
        )}`
      );

      eventSource.addEventListener("close", (event) => {
        eventSource.close();
        router.push(`/c/${conversation.id}`);
      });
    },
    [router]
  );

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Chat Header */}
      <header className="bg-white p-4 text-gray-700">
        <h1 className="text-2xl font-semibold">New Chat</h1>
      </header>
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 pb-36"></div>
      <footer className="bg-white border-t border-gray-300 p-4">
        <div className="flex items-center">
          <TextareaAutosize
            placeholder="Type a message..."
            className="w-full p-2 rounded-md border border-gray-400 focus:outline-none focus:border-blue-500 resize-none"
            maxRows={15}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault(); // Prevent default Enter key behavior
                const target = e.target as HTMLTextAreaElement;
                const cursorPosition = target.selectionStart; // Get the current cursor position
                // Create a new message string with the newline inserted at the current cursor position
                const newMessage =
                  message.slice(0, cursorPosition) +
                  "\n" +
                  message.slice(cursorPosition);
                setMessage(newMessage);
                setTimeout(() => {
                  target.selectionStart = cursorPosition + 1;
                  target.selectionEnd = cursorPosition + 1;
                }, 0);
              } else if (e.key === "Enter") {
                e.preventDefault();
                submit(message);
              }
            }}
            value={message}
          />
          <button
            className="bg-indigo-500 text-white px-4 py-2 rounded-md ml-2"
            onClick={() => submit(message)}
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
