import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { IoMdCopy } from "react-icons/io";
import { ChatMessage } from "@prisma/client";
type Prop = { message: ChatMessage };

type IconPron = { fColor: string; bgColor: string; text: string; alt: string };
function Icon({ fColor, bgColor, text, alt }: IconPron) {
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center mr-2 shrink-0">
      <img
        src={`https://placehold.co/200x/${bgColor}/${fColor}.svg?text=${text}`}
        alt={alt}
        className="w-8 h-8 rounded-full"
      />
    </div>
  );
}

export function Message({ message }: Prop) {
  const isOutgoing = message.sender === "user";
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };
  return (
    <div
      className={`flex mb-4 cursor-pointer ${
        isOutgoing ? "justify-end" : "justify-start"
      }`}
    >
      {!isOutgoing && (
        <Icon
          fColor="ffffff"
          bgColor="b7a8ff"
          text={message.sender[0].toUpperCase()}
          alt={message.sender}
        />
      )}
      <div
        className={`flex flex-col ${
          isOutgoing ? "bg-indigo-500 text-white" : "bg-white text-gray-700"
        } rounded-lg p-3 gap-3`}
      >
        <Markdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          className="flex-grow"
        >
          {message.content}
        </Markdown>
        {!isOutgoing && (
          <button
            onClick={copyToClipboard}
            className="p-1 bg-purple-300 rounded-full flex items-center justify-center self-start"
          >
            <IoMdCopy className="text-white text-base" /> 
          </button>
        )}
      </div>
      {isOutgoing && (
        <Icon fColor="ffffff" bgColor="b7a8ff" text="U" alt="My Avatar" />
      )}
    </div>
  );
}

export default Message;
