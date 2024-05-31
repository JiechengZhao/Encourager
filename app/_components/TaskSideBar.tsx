"use client";
import React, { useCallback } from "react";
import { getSubtasks } from "@/app/t/taskAction";
import { useTaskRecord } from "./TaskRecordContext";
import { getAllTasksFromSubtaskRecords } from "@/lib/tools";
import { useRouter } from "next/navigation";

const TaskMain = () => {
  const { taskRecord, rootTaskId } = useTaskRecord();

  if (!taskRecord) {
    return "loading";
  }
  return (
    <div className="flex flex-col w-1/4 bg-white border-r border-gray-300 h-screen">
      <div className="flex-grow overflow-y-auto p-3 mb-1 pb-10">
        <TaskNode key={rootTaskId} taskId={rootTaskId} />
      </div>
    </div>
  );
};

const TaskNode = ({ taskId }: { taskId: number }) => {
  const {
    taskRecord,
    setTaskRecord,
    expandRecord,
    deleteExpandRecord,
    addExpandRecord,
    currentTaskId,
  } = useTaskRecord();
  const isExpanded = expandRecord.has(taskId);
  const task = taskRecord ? taskRecord[taskId] : undefined;
  const router = useRouter();

  const toggleExpand = useCallback(async () => {
    if (isExpanded) {
      deleteExpandRecord(taskId);
    } else {
      if (task && !task.subtasks) {
        const subtasks = await getSubtasks(task.id, 2);
        console.log(subtasks);
        const tasks = getAllTasksFromSubtaskRecords(subtasks, {});
        task.subtasks = subtasks[task.id].map((t) => t.id);
        const NewTaskRecord = { ...taskRecord, ...tasks };
        console.log(subtasks);
        for (const id_ of Object.keys(subtasks)) {
          const id = Number(id_);
          console.log(id)
          NewTaskRecord[id].subtasks = subtasks[id].map((t) => t.id);
        }
        setTaskRecord(NewTaskRecord);
      }
      addExpandRecord(taskId);
    }
  }, [task, isExpanded, addExpandRecord, deleteExpandRecord, setTaskRecord, taskId, taskRecord]);

  if (!task) {
    return `error load task ${taskId}`;
  }

  const showExpand = !(task.subtasks && task.subtasks.length === 0);
  const isCurrentTask = task.id === currentTaskId;
  return (
    <div className="task-node bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {showExpand ? (
            <button
              onClick={toggleExpand}
              className="select-none mr-2 w-6 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-gray-300"
            >
              {isExpanded ? "-" : "+"}
            </button>
          ) : (
            <button className="w-6 mr-2 select-none">•</button>
          )}
          <span
            onClick={(e) => {
              router.push(`/t/${taskId}`, { scroll: false });
            }}
            className={`text-gray-800 px-1 font-medium ${
              isCurrentTask ? "bg-yellow-100" : ""
            }`}
          >
            {task.name}
          </span>
        </div>
        {task.dueDate && (
          <span className="text-gray-500 text-sm">
            Due: {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
      {isExpanded && task.subtasks && (
        <div className="ml-6">
          {task.subtasks.map((subtaskId) => (
            <TaskNode key={subtaskId} taskId={subtaskId} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskMain;
