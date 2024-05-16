"use client";
import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { IncomingMessage, OutgoingMessage } from "@/app/c/_components/message";
import {
  getFullConversation,
  ChatMessage,
  ConversationFull,
  saveChatMessage,
  talkToLMM,
} from "@/app/c/_actions/conversation";

import TextareaAutosize from "react-textarea-autosize";

export default function Home({}) {
  const question = "Hi, please tell me who you are";
  const [conversation, setConversation] = useState<ConversationFull>();
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const { chatId } = useParams();

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
  }, [chatId]);

  // ...
  const submit = useCallback(
    async (text: string) => {
      setMessage("");
      if (conversation) {
        const chat = await saveChatMessage(conversation.id, "user", text);
        setChats([...chats, chat]);
        for (const dialog of conversation.dialogs) {
          talkToLMM(text, dialog.id, conversation.id, dialog.bot).then(
            (chat) => {
              setChats((chats) => [...chats, chat]);
            }
          );
        }
      }
    },
    [conversation, chats]
  );

  if (!conversation) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex-1">
      {/* Chat Header */}
      <header className="bg-white p-4 text-gray-700">
        <h1 className="text-2xl font-semibold">Alice</h1>
      </header>
      {/* Chat Messages */}
      <div className="h-screen overflow-y-auto p-4 pb-36">
        {/* Outgoing Message */}
        {chats.map(({ sender, content }, index) => {
          if (sender === "user") {
            return <OutgoingMessage key={`q-${index}`} message={content} />;
          } else {
            return <IncomingMessage key={`a-${index}`} message={content} />;
          }
        })}
      </div>
      {/* Chat Input */}
      <footer className="bg-white border-t border-gray-300 p-4 absolute bottom-0 w-3/4">
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
