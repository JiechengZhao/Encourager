"use client";
import React, { useCallback, useEffect, useState } from "react";
import { TaskRecord } from "@/lib/types";
import { getSubtasks, getTask } from "@/app/t/taskAction";
import { useTaskRecord } from "./TaskRecordContext";
import { getAllTasksFromSubtaskRecords } from "@/lib/tools";


const TaskMain = () => {
  const {
    taskRecord,
    setTaskRecord,
    rootTaskId,
    setRootTaskId,
    setExpandRecord,
    setCurrentTaskId,
  } = useTaskRecord();


  if (!taskRecord) {
    return "loading";
  }
  return (
    <div className="task-tree">
      <TaskNode key={rootTaskId} taskId={rootTaskId} />
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
  console.log(taskId);
  const task = taskRecord ? taskRecord[taskId] : undefined;

  const toggleExpand = useCallback(async () => {
    if (isExpanded) {
      deleteExpandRecord(taskId);
    } else {
      if (task && !task.subtasks) {
        const subtasks = await getSubtasks(task.id, 2);
        const tasks = getAllTasksFromSubtaskRecords(subtasks, {});
        task.subtasks = subtasks[task.id].map((t) => t.id);
        const NewTaskRecord = { ...taskRecord, ...tasks };
        for (const id in Object.keys(subtasks)) {
          NewTaskRecord[id].subtasks = subtasks[id].map((t) => t.id);
        }
        setTaskRecord(NewTaskRecord);
      }
      addExpandRecord(taskId);
    }
  }, [task, isExpanded]);

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
