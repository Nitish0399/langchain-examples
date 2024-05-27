const { ChatOpenAI } = require("@langchain/openai");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { InMemoryChatMessageHistory } = require("@langchain/core/chat_history");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { RunnableWithMessageHistory } = require("@langchain/core/runnables");

async function main() {
  const messageHistories = {}; // Record<string, InMemoryChatMessageHistory>

  const model = new ChatOpenAI("gpt-4");

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are a helpful assistant who remembers all details the user shares with you.`,
    ],
    ["placeholder", "{chat_history}"],
    ["human", "{input}"],
  ]);

  const parser = new StringOutputParser();

  const chain = prompt.pipe(model).pipe(parser);

  const withMessageHistory = new RunnableWithMessageHistory({
    runnable: chain,
    getMessageHistory: async (sessionId) => {
      if (messageHistories[sessionId] === undefined) {
        messageHistories[sessionId] = new InMemoryChatMessageHistory();
      }
      return messageHistories[sessionId];
    },
    inputMessagesKey: "input",
    historyMessagesKey: "chat_history",
  });

  const config1 = {
    configurable: {
      sessionId: "abc1",
    },
  };

  const response1 = await withMessageHistory.invoke(
    {
      input: "Hi! I'm Bob",
    },
    config1
  );

  console.log(response1);

  const config2 = {
    configurable: {
      sessionId: "abc2",
    },
  };

  const response2 = await withMessageHistory.invoke(
    {
      input: "What is my name",
    },
    config2
  );

  console.log(response2);
}

module.exports = main;
