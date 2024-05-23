export default {
  main: {
    name: "main",
    bot: "llama3-8b-8192-basic",
    system: "",
  },
  revisor: {
    name: "revisor",
    bot: "llama3-8b-8192-basic",
    system: "",
    template: `Please revise the following text and provide only the revised text. Do not include any additional comments. If there is nothing to revise, just respond with "No changes needed."
Please revise:

%s.`,
    mode: "no-history",
  },
};
