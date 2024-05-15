"use client";
import { useState } from "react";
import { IncomingMessage, OutgoingMessage } from "@/app/c/_components/message";
import { llm } from "@/app/c/_actions/llm";
import TextareaAutosize from "react-textarea-autosize";

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
    const newChats = [
      ...chats,
      { question: message.slice(0, 8000), answer: "" },
    ];
    setChats(newChats);
    try {
      const answer = await llm(message, chats);
      console.log(message, answer);
      const newChats2 = [...chats, { question: message, answer }];
      setChats(newChats2);
    } catch (e) {
      if (e instanceof Error) {
        const newChats2 = [
          ...chats,
          { question: message, answer: e.toString() },
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
