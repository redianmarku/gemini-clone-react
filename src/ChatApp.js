import React, { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

const ChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const chatSessionRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    if (!chatSessionRef.current) {
      chatSessionRef.current = model.startChat({
        generationConfig: {
          temperature: 0.9,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        },
        history: [],
      });
    }
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { text: input, sender: "user" }]);
    setInput("");
    setIsTyping(true);

    try {
      let fullResponse = "";
      const result = await chatSessionRef.current.sendMessageStream(input);

      setMessages((prev) => [
        ...prev,
        { text: "", sender: "ai", isGenerating: true },
      ]);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;

        setMessages((prev) => [
          ...prev.slice(0, -1),
          { text: fullResponse, sender: "ai", isGenerating: true },
        ]);
      }

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { text: fullResponse, sender: "ai", isGenerating: false },
      ]);

      setIsTyping(false);
    } catch (error) {
      console.error("Error:", error);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          text: "Sorry, there was an error processing your request.",
          sender: "ai",
          isGenerating: false,
        },
      ]);
    }
  };

  const MarkdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    h1: ({ node, ...props }) => (
      <h1 style={{ fontSize: "2em", fontWeight: "bold" }} {...props} />
    ),
    h2: ({ node, ...props }) => (
      <h2 style={{ fontSize: "1.5em", fontWeight: "bold" }} {...props} />
    ),
    h3: ({ node, ...props }) => (
      <h3 style={{ fontSize: "1.17em", fontWeight: "bold" }} {...props} />
    ),
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <style jsx global>{`
        @keyframes typing {
          0% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.3;
          }
        }
        .typing-animation {
          animation: typing 1.5s infinite;
        }
        .prose {
          max-width: 65ch;
          font-size: 1rem;
          line-height: 1.75;
        }
        .prose code {
          background-color: #2d2d2d;
          color: #e0e0e0;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-size: 0.85em;
        }
        .prose pre {
          background-color: #2d2d2d;
          border-radius: 0.3em;
          padding: 1em;
          overflow-x: auto;
        }
        .prose pre code {
          background-color: transparent;
          padding: 0;
          border-radius: 0;
          color: inherit;
        }
        .ai-message {
          background-color: #f0f0f0;
          color: #333;
        }
        .ai-message .prose pre {
          background-color: #2d2d2d;
          color: #e0e0e0;
        }
      `}</style>
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-2xl font-bold">Gemini Chat</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 ${
              message.sender === "user" ? "text-right" : "text-left"
            }`}
          >
            <div
              className={`inline-block p-2 rounded-lg ${
                message.sender === "user"
                  ? "bg-blue-500 text-white"
                  : "ai-message"
              }`}
            >
              {message.sender === "user" ? (
                message.text
              ) : (
                <ReactMarkdown
                  className={`prose max-w-none ${
                    message.isGenerating ? "typing-animation" : ""
                  }`}
                  components={MarkdownComponents}
                >
                  {message.text || "Thinking..."}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="text-left">
            <div className="inline-block p-2 rounded-lg bg-gray-300">
              Typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 bg-white">
        <div className="flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="p-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Send size={24} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatApp;
