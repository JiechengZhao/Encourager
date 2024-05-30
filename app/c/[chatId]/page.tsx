"use client";
import { useParams } from "next/navigation";

import ChatBox from "@/app/_components/ChatBox";

export default function Home({}) {
  const { chatId } = useParams();
  const id = Number(chatId);
  return <ChatBox chatId={id} />;
}
