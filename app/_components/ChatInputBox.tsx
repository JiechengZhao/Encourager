"use client";
import { useState, useCallback, KeyboardEventHandler } from "react";
import TextareaAutosize from "react-textarea-autosize";

export default function ChatInputBox({
  submit,
}: {
  submit: (message: string) => Promise<void>;
}) {
  const [message, setMessage] = useState("");

  const onKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = useCallback(
    (e) => {
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
        setMessage("");
      }
    },
    [message, submit]
  );

  return (
    <div className="flex items-center">
      <TextareaAutosize
        placeholder="Type a message..."
        className="w-full p-2 rounded-md border border-gray-400 focus:outline-none focus:border-blue-500 resize-none"
        maxRows={15}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={onKeyDown}
        value={message}
      />
      <button
        className="bg-indigo-500 text-white px-4 py-2 rounded-md ml-2"
        onClick={(e) => {
          submit(message);
          setMessage("");
        }}
      >
        Send
      </button>
    </div>
  );
}
