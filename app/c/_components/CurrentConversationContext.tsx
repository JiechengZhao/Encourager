"use client";
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { ConversationFull } from "../_actions/conversation";

interface CurrentConversationContextType {
  conversation: ConversationFull | undefined;
  setConversation: React.Dispatch<
    React.SetStateAction<ConversationFull | undefined>
  >;
}

// Create the context
const ConversationContext = createContext<
  CurrentConversationContextType | undefined
>(undefined);

// Custom hook to use the conversation context
export const useCurrentConversation = (): CurrentConversationContextType => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error(
      "useConversation must be used within a ConversationProvider"
    );
  }
  return context;
};

export const CurrentConversationProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  const [conversation, setConversation] = useState<ConversationFull>();

  return (
    <ConversationContext.Provider value={{ conversation, setConversation }}>
      {children}
    </ConversationContext.Provider>
  );
};
