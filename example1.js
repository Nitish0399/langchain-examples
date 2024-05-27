const { ChatOpenAI } = require("@langchain/openai");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { ChatPromptTemplate } = require("@langchain/core/prompts");

async function main() {
  const model = new ChatOpenAI("gpt-4");

  const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", "Translate the following into {language}:"],
    ["user", "{text}"],
  ]);

  const parser = new StringOutputParser();
  const chain = promptTemplate.pipe(model).pipe(parser);

  const result = await chain.invoke({ language: "italian", text: "hi" });

  console.log(result);
}

module.exports = main;
