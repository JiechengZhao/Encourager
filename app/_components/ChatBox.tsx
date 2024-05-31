"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { Message } from "@/app/_components/Message";
import { getFullConversation } from "@/app/c/_actions/conversation";
import { ChatMessage } from "@prisma/client";

import { useCurrentConversation } from "@/app/_components/CurrentConversationContext";
import ChatInputBox from "@/app/_components/ChatInputBox";

export default function ChatBox({ chatId }: { chatId: number }) {
  const { conversation, setConversation } = useCurrentConversation();
  const [dialogId, setDialogId] = useState<number>(-1);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats]);

  useEffect(() => {
    if (chatId) {
      getFullConversation(chatId).then((conversation) => {
        if (conversation) {
          setConversation(conversation);
          setChats(conversation?.chatMessages || []);
        } else {
          throw new Error("Conversation not found");
        }
      });
    }
  }, [chatId, setConversation]);

  const submit = useCallback(
    async (text: string) => {
      if (conversation) {
        const dialogQuery = dialogId > 0 ? `&dialogId=${dialogId}` : "";
        const eventSource = new EventSource(
          `/talk?conversationId=${conversation.id}&text=${encodeURIComponent(
            text
          )}${dialogQuery}`
        );

        eventSource.addEventListener("rename-title", (event) => {
          setConversation((conversation) => {
            if (conversation) {
              return { ...conversation, title: JSON.parse(event.data) };
            }
          });
        });
        eventSource.addEventListener("open-dialog", (event) => {
          setDialogId(JSON.parse(event.data));
        });

        eventSource.addEventListener("close-dialog", () => {
          setDialogId(-1);
        });

        eventSource.addEventListener("system-message", (event) => {
          setChats((chats) => [...chats, JSON.parse(event.data)]);
        });

        eventSource.addEventListener("close", (event) => {
          eventSource.close();
        });

        eventSource.addEventListener("message", (event) => {
          setChats((chats) => [...chats, JSON.parse(event.data)]);
        });

        eventSource.onerror = (err) => {
          console.error("Event source error: ", err);
          eventSource.close();
        };
      }
    },
    [conversation, dialogId, setConversation]
  );

  if (!conversation) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Chat Header */}
      <header className="bg-white p-4 text-gray-700">
        <h1 className="text-2xl font-semibold">{conversation.title}</h1>
      </header>
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 pb-36">
        {/* Outgoing Message */}
        {chats.map((message, index) => {
          return <Message key={`a-${index}`} message={message} />;
        })}
        <div ref={chatEndRef} />
      </div>
      {/* Chat Input */}
      <footer className="bg-white border-t border-gray-300 p-4">
        <ChatInputBox submit={submit} />
      </footer>
    </div>
  );
}
