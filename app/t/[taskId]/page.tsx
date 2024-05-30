"use client";
import { useParams } from "next/navigation";

import ChatBox from "@/app/_components/ChatBox";
import { useTaskRecord } from "@/app/_components/TaskRecordContext";
import { getTask } from "../taskAction";
import { TaskRecord } from "@/lib/types";
import { useEffect } from "react";

function findParents(taskRecord: TaskRecord, id: number): Set<number> {
  const parentId = taskRecord[id].parentId;
  if (parentId) {
    const parents = findParents(taskRecord, parentId);
    return parents.add(parentId);
  }
  return new Set();
}

export default function Home({}) {
  const { taskId } = useParams();

  const {
    taskRecord,
    setTaskRecord,
    currentTaskId,
    setRootTaskId,
    setExpandRecord,
    setCurrentTaskId,
  } = useTaskRecord();

  useEffect(() => {
    const taskId_ = Number(taskId);
    const loadTask = async () => {
      if (taskId_) {
        const task = await getTask(taskId_, 3);
        setTaskRecord(task.tasks);
        setRootTaskId(task.root);
        setCurrentTaskId(task.current);
        setExpandRecord(findParents(task.tasks, taskId_).add(taskId_));
      }
    };

    loadTask();
  }, [taskId]);
  if (taskRecord && taskRecord[currentTaskId]) {
    const task = taskRecord[currentTaskId];
    return <ChatBox chatId={task.conversationId||1} />;
  }
}
