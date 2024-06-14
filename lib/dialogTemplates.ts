const data = {
  main: {
    name: "main",
    bot: "llama3-8b-8192-basic",
    system: "",
  },
};

export function getMainDialogTemplate(system: string = "") {
  return { ...data.main, system };
}

export default data;
