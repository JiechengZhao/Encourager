"use client";
import { useRouter } from "next/navigation";
import {
  getLastKTouchedConversations,
  createNewConversation,
} from "@/app/c/_actions/conversation";
import { useCallback, useEffect, useState } from "react";
import { useCurrentConversation } from "./CurrentConversationContext";
import { ConversationShort } from "@/lib/types";
import Image from "next/image";

function Item({
  name,
  description,
  conversationId,
}: {
  name: string;
  description: string;
  conversationId: number;
}) {
  const router = useRouter();
  const handleClick = () => {
    router.push(`/c/${conversationId}`);
  };
  return (
    <div
      className="flex items-center mb-4 cursor-pointer hover:bg-gray-100 p-2 rounded-md"
      onClick={handleClick}
    >
      <div className="w-12 h-12 bg-gray-300 rounded-full mr-3">
        <img
          src="https://placehold.co/200x/ffa8e4/ffffff.svg?text=ʕ•́ᴥ•̀ʔ&font=Lato"
          alt="User Avatar"
          className="w-12 h-12 rounded-full"
        />
      </div>
      <div className="flex-1">
        <h2 className="text-lg font-semibold">{name}</h2>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}

export default function ChatSidebar() {
  const router = useRouter();
  const { conversation } = useCurrentConversation();
  const [conversations, setConversations] = useState<ConversationShort[]>([]);

  useEffect(() => {
    getLastKTouchedConversations(20).then((cons) => {
      if (conversation) {
        // Remove the existing conversation with the same ID, if any
        cons = cons.filter((conv) => conv.id !== conversation.id);
        // Add the current conversation to the beginning of the list
        cons.unshift(conversation);
      }
      setConversations(cons);
    });
  }, [conversation]);

  const newConversation = useCallback(async () => {
    const conversation = await createNewConversation();
    router.push(`/c/${conversation.id}`);
  }, [router]);

  return (
    <div className="flex flex-col w-1/4 bg-white border-r border-gray-300 h-screen">
      <div className="flex-grow overflow-y-auto p-3 mb-1 pb-10">
        {conversations.map((conversation) => {
          return (
            <Item
              key={conversation.id}
              name={conversation.title}
              description={conversation.description || ""}
              conversationId={conversation.id}
            />
          );
        })}
      </div>
      <footer className="p-3">
        <button
          className="w-full py-2 px-4 bg-blue-500 text-white text-2xl font-semibold rounded hover:bg-blue-600"
          onClick={newConversation}
        >
          + New Chat
        </button>
      </footer>
    </div>
  );
}
