"use client";
import { useState } from "react";
import { IncomingMessage, OutgoingMessage } from "./_components/chat";
import { llm } from "./actions";

type Chat = {
  question: string;
  answer: string;
};

export default function Home({}) {
  const question = "Hi, please tell me who you are";
  const [chats, setChats] = useState<Chat[]>([]);
  const [message, setMessage] = useState("");
  async function submit() {
    console.log(message);
    setMessage("");
    const newChats = [...chats, { question: message.slice(0, 8000), answer: "" }];
    setChats(newChats);
    try {
      const answer = await llm(message, chats);
      console.log(message, answer);
      const newChats2 = [...chats, { question: message, answer }];
      setChats(newChats2);
    } catch (e) {
      if (e instanceof Error) {
        // Handle generic errors
        const newChats2 = [
          ...chats,
          { question: message, answer: `The question is too long ${message.length}`},
        ];
        setChats(newChats2);
      }
    }
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
        {chats
          .map(({ question, answer }, index) => {
            const l = [
              <OutgoingMessage key={`q-${index}`} message={question} />,
            ];
            if (answer.length > 0) {
              l.push(<IncomingMessage key={`a-${index}`} message={answer} />);
            }
            return l;
          })
          .flat()}
      </div>
      {/* Chat Input */}
      <footer className="bg-white border-t border-gray-300 p-4 absolute bottom-0 w-3/4">
        <div className="flex items-center">
          <input
            type="text"
            placeholder="Type a message..."
            className="w-full p-2 rounded-md border border-gray-400 focus:outline-none focus:border-blue-500"
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                console.log("Enter key pressed!");
                // Here you can call any function you want to execute
                submit();
              }
            }}
            value={message}
          />
          <button
            className="bg-indigo-500 text-white px-4 py-2 rounded-md ml-2"
            onClick={submit}
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
