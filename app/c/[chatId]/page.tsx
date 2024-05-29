"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Message } from "@/app/c/_components/message";
import { getFullConversation } from "@/app/c/_actions/conversation";
import { ChatMessage } from "@prisma/client";

import TextareaAutosize from "react-textarea-autosize";
import { useCurrentConversation } from "@/app/c/_components/CurrentConversationContext";

export default function Home({}) {
  const { conversation, setConversation } = useCurrentConversation();
  const [dialogId, setDialogId] = useState<number>(-1);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const { chatId } = useParams();
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
      const id = Number(chatId);
      getFullConversation(id).then((conversation) => {
        if (conversation) {
          setConversation(conversation);
          setChats(conversation?.chatMessages || []);
        } else {
          throw new Error("Conversation not found");
        }
      });
    }
  }, [chatId, setConversation]);

  // ...
  const submit = useCallback(
    async (text: string) => {
      setMessage("");
      if (conversation) {
        const dialogQuery = dialogId > 0 ? `&dialogId=${dialogId}` : "";
        const eventSource = new EventSource(
          `/c/talk?conversationId=${conversation.id}&text=${encodeURIComponent(
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
