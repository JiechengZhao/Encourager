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
    if (taskId_) {
      const loadTask = async () => {
        const task = await getTask(taskId_, 3);
        setTaskRecord((tasks) => {
          if (!tasks) {
            return task.tasks;
          }
          for (const id_ of Object.keys(task.tasks)) {
            const id = Number(id_);
            if (!task.tasks[id].subtasks && tasks[id] && tasks[id].subtasks) {
              task.tasks[id].subtasks = tasks[id].subtasks;
            }
          }
          const res = { ...tasks, ...task.tasks };
          return res;
        });
        setRootTaskId(task.root);
        setCurrentTaskId(task.current);
        setExpandRecord(
          (expand) =>
            new Set([
              ...Array.from(expand),
              ...Array.from(findParents(task.tasks, taskId_)),
              taskId_,
            ])
        );
      };
      loadTask();
    }
  }, [taskId, setCurrentTaskId, setExpandRecord, setRootTaskId, setTaskRecord]);

  if (taskRecord && taskRecord[currentTaskId]) {
    const task = taskRecord[currentTaskId];
    return <ChatBox chatId={task.conversationId || 1} />;
  }
}
