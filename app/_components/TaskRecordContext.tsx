"use client";
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { TaskRecord } from "@/lib/types";

interface TaskRecordContextType {
  taskRecord: TaskRecord | undefined;
  setTaskRecord: React.Dispatch<React.SetStateAction<TaskRecord | undefined>>;
  rootTaskId: number;
  setRootTaskId: React.Dispatch<React.SetStateAction<number>>;
  currentTaskId: number;
  setCurrentTaskId: React.Dispatch<React.SetStateAction<number>>;
  expandRecord: Set<number>;
  setExpandRecord: React.Dispatch<React.SetStateAction<Set<number>>>;
  deleteExpandRecord: (taskId: number) => void;
  addExpandRecord: (taskId: number) => void;
}

// Create the context
const TaskRecordContext = createContext<TaskRecordContextType | undefined>(
  undefined
);

// Custom hook to use the conversation context
export const useTaskRecord = (): TaskRecordContextType => {
  const context = useContext(TaskRecordContext);
  if (!context) {
    throw new Error("useTaskRecord must be used within a TaskRecordProvider");
  }
  return context;
};

export const TaskRecordProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  const [taskRecord, setTaskRecord] = useState<TaskRecord>();
  const [rootTaskId, setRootTaskId] = useState<number>(-1);
  const [currentTaskId, setCurrentTaskId] = useState<number>(-1);
  const [expandRecord, setExpandRecord] = useState<Set<number>>(new Set());

  const deleteExpandRecord = useCallback((taskId: number) => {
    setExpandRecord((prevExpandRecord) => {
      const newExpandRecord = new Set(prevExpandRecord);
      newExpandRecord.delete(taskId);
      return newExpandRecord;
    });
  }, []);

  const addExpandRecord = useCallback((taskId: number) => {
    setExpandRecord((prevExpandRecord) => {
      const newExpandRecord = new Set(prevExpandRecord);
      newExpandRecord.add(taskId);
      return newExpandRecord;
    });
  }, []);

  return (
    <TaskRecordContext.Provider
      value={{
        taskRecord,
        setTaskRecord,
        rootTaskId,
        setRootTaskId,
        expandRecord,
        setExpandRecord,
        deleteExpandRecord,
        addExpandRecord,
        currentTaskId,
        setCurrentTaskId,
      }}
    >
      {children}
    </TaskRecordContext.Provider>
  );
};
