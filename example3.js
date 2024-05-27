const cheerio = require("cheerio");
const {
  CheerioWebBaseLoader,
} = require("langchain/document_loaders/web/cheerio");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const { OpenAIEmbeddings, ChatOpenAI } = require("@langchain/openai");
const { pull } = require("langchain/hub");
const {
  ChatPromptTemplate,
  MessagesPlaceholder,
} = require("@langchain/core/prompts");
const { AIMessage, HumanMessage } = require("@langchain/core/messages");

const {
  RunnableSequence,
  RunnablePassthrough,
} = require("@langchain/core/runnables");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const {
  createStuffDocumentsChain,
} = require("langchain/chains/combine_documents");
const { formatDocumentsAsString } = require("langchain/util/document");

async function main() {
  const loader = new CheerioWebBaseLoader(
    "https://lilianweng.github.io/posts/2023-06-23-agent/"
  );

  const docs = await loader.load();

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const splits = await textSplitter.splitDocuments(docs);
  const vectorStore = await MemoryVectorStore.fromDocuments(
    splits,
    new OpenAIEmbeddings()
  );

  const outputParser = new StringOutputParser();

  // Retrieve and generate using the relevant snippets of the blog.
  const retriever = vectorStore.asRetriever();

  //   const prompt = await pull("rlm/rag-prompt"); // takes in an built-in prompt (ChatPromptTemplate)
  const llm = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });
  //   let ragChain = await createStuffDocumentsChain({
  //     llm,
  //     prompt,
  //     outputParser,
  //   });

  // Printing the prompt
  //   console.log(
  //     prompt.promptMessages.map((msg) => msg.prompt.template).join("\n")
  //   );

  //   let aiMsg = await ragChain.invoke({
  //     context: await retriever.invoke("What is Task Decomposition?"),
  //     question: "What is Task Decomposition?",
  //   });

  //   console.log(aiMsg);

  const contextualizeQSystemPrompt = `Given a chat history and the latest user question
which might reference context in the chat history, formulate a standalone question
which can be understood without the chat history. Do NOT answer the question,
just reformulate it if needed and otherwise return it as is.`;

  const contextualizeQPrompt = ChatPromptTemplate.fromMessages([
    ["system", contextualizeQSystemPrompt],
    new MessagesPlaceholder("chat_history"),
    ["human", "{question}"],
  ]);
  const contextualizeQChain = contextualizeQPrompt.pipe(llm).pipe(outputParser);

  //   console.log(
  //     await contextualizeQChain.invoke({
  //       chat_history: [
  //         new HumanMessage("What does LLM stand for?"),
  //         new AIMessage("Large language model"),
  //       ],
  //       question: "What is meant by large",
  //     })
  //   );

  const qaSystemPrompt = `You are an assistant for question-answering tasks.
  Use the following pieces of retrieved context to answer the question.
  If you don't know the answer, just say that you don't know.
  Use three sentences maximum and keep the answer concise.

  {context}`;

  const qaPrompt = ChatPromptTemplate.fromMessages([
    ["system", qaSystemPrompt],
    new MessagesPlaceholder("chat_history"),
    ["human", "{question}"],
  ]);

  // Notice we add context to the prompt only when our chat history isn’t empty.
  ragChain = RunnableSequence.from([
    RunnablePassthrough.assign({
      context: (input) => {
        if ("chat_history" in input) {
          // Here we’re taking advantage of the fact that if a function in an LCEL chain returns another chain, that chain will itself be invoked.
          return contextualizeQChain
            .pipe(retriever)
            .pipe(formatDocumentsAsString); // additionally chaining contextualized prompt to fetch relevant documents using the retriever
        }
        return "";
      },
    }),
    qaPrompt,
    llm,
  ]);

  let chat_history = [];

  const question = "What is task decomposition?";
  aiMsg = await ragChain.invoke({ question, chat_history });
  console.log(aiMsg);

  chat_history = chat_history.concat(aiMsg);

  ragChain = ragChain.pipe(outputParser);

  const secondQuestion = "What are common ways of doing it?";
  aiMsg = await ragChain.invoke({ question: secondQuestion, chat_history });

  console.log(aiMsg);
}

module.exports = main;
