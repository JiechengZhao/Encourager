"use client";
import {
  useCallback,
  useEffect,
  useRef,
} from "react";
import { createNewConversation } from "./_actions/conversation";
import { useRouter } from "next/navigation";
import ChatInputBox from "@/app/_components/ChatInputBox";

export default function Greeting() {
  const router = useRouter();

  const submit = useCallback(
    async (message: string) => {
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
        <ChatInputBox submit={submit} />
      </footer>
    </div>
  );
}

