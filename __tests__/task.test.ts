import { getTask } from "@/lib/getParents";
import { extractJson } from "../lib/tools";


describe("Task Functions", () => {
  test("get task 2", async () => {
    const task = await getTask(2, 3)
    console.log(task)
  })

  test("get task 2", async () => {
    const task = extractJson(`Here is the TODO list in JSON format:

    {
      "id": "1",
      "name": "Create a UI to represent the database model",
      "estimate_time": "4-6 hours",
      "parentId": null,
      "dependency": []
    }`)
    console.log(task)
  })
  test("get task 2", async () => {
    const task = extractJson(`Here is the TODO list in JSON format:

    [
      {
        "id": "1",
        "name": "Create a UI to represent the database model",
        "estimate_time": "4-6 hours",
        "parentId": null,
        "dependency": []
      },
      {
        "id": "2",
        "name": "Find prompts and teach the AI to use the task system",
        "estimate_time": "4-6 hours",
        "parentId": null,
        "dependency": []
      }
    ]
    `)
    console.log(task)
  })
});
