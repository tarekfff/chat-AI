/* eslint-disable @typescript-eslint/no-explicit-any */


"use client";
import { useState, useRef, useEffect } from "react";
import { FaPaperPlane, FaPaperclip, FaTrash, FaRobot, FaUser } from "react-icons/fa";
import { ImSpinner8 } from "react-icons/im";
import axios from "axios";

interface Message {
  sender: string;
  text: string;
  timestamp: Date;
  type?: "text" | "file";
  fileName?: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // يحاول يحول النص لـ JSON
  const tryParseJson = (text: string) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };




  // Replace with your n8n webhook URL
  const N8N_WEBHOOK_URL = "https://n8n.srv974225.hstgr.cloud/webhook-test/1947159d-0436-4b21-97ac-6360cabb1f1c";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input && !file) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (input) formData.append("message", input);
      if (file) formData.append("file", file);

      // Add user message immediately for better UX
      const userMessage: Message = {
        sender: "user",
        text: input || file?.name || "",
        timestamp: new Date(),
        type: file ? "file" : "text",
        fileName: file?.name
      };

      setMessages(prev => [...prev, userMessage]);
      setInput("");
      setFile(null);

      // Send to n8n webhook
      const response = await sendToN8NWorkflow(input, file);

      const aiMessage: Message = {
        sender: "ai",
        text: response,
        timestamp: new Date(),
        type: "text"
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      setError("فشل في إرسال الرسالة. حاول مرة أخرى.");
      console.error("Error sending message:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendToN8NWorkflow = async (message: string, file: File | null): Promise<string> => {
    try {
      interface Payload {
        message: string;
        timestamp: string;
        sessionId: string;
        fileName?: string;
        fileType?: string;
        fileSize?: number;
        fileContent?: string;
      }

      const payload: Payload = {
        message,
        timestamp: new Date().toISOString(),
        sessionId: generateSessionId(),
      };


      // If there's a file, handle it appropriately
      if (file) {
        // For files, you might want to upload to a storage service first
        // and then send the URL to n8n, or use n8n's file handling capabilities
        payload.fileName = file.name;
        payload.fileType = file.type;
        payload.fileSize = file.size;

        // If you want to send the file content as base64 (for small files)
        if (file.size < 500000) { // 500KB limit
          const base64Content = await fileToBase64(file);
          payload.fileContent = base64Content;
        }
      }

      // Send to n8n webhook
      const response = await axios.post(N8N_WEBHOOK_URL, payload, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 second timeout
      });

      // Handle different response formats from n8n
      if (response.data && response.data.response) {
        return response.data.response;
      } else if (response.data && typeof response.data === "string") {
        return response.data;
      } else if (response.data && response.data.message) {
        return response.data.message;
      } else {
        return "تم استلام رسالتك وسيتم الرد قريباً.";
      }
    } catch (error) {
      console.error("Error calling n8n webhook:", error);
      throw new Error("تعذر الاتصال بخدمة الذكاء الاصطناعي");
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const generateSessionId = (): string => {
    // Generate a unique session ID for tracking conversations
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-2 rounded-full">
              <FaRobot className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">مساعد الذكاء الاصطناعي</h1>
              <p className="text-sm text-gray-500">متاح للمساعدة في أي وقت</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-500">متصل</span>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 bg-gradient-to-b from-gray-50 to-gray-100">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-white p-6 rounded-2xl shadow-lg max-w-md">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <FaRobot className="text-white text-2xl" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">مرحباً!</h2>
              <p className="text-gray-600 mb-4">كيف يمكنني مساعدتك اليوم؟</p>
              <div className="grid grid-cols-1 gap-2 text-sm text-gray-500">
                <p>✓ اسألني أي سؤال</p>
                <p>✓ اطلب مني إنشاء محتوى</p>
                <p>✓ أرسل ملفاً للتحليل</p>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md rounded-2xl p-5 relative ${msg.sender === "user"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-br-none shadow-lg"
                  : "bg-white text-gray-800 rounded-bl-none shadow-md border border-gray-100"
                  }`}
              >
                {/* Message Header */}
                <div className="flex items-center mb-3">
                  <div className={`p-2 rounded-full mr-2 ${msg.sender === "user" ? "bg-indigo-800" : "bg-gray-100"}`}>
                    {msg.sender === "user" ? (
                      <FaUser className={`text-sm ${msg.sender === "user" ? "text-white" : "text-gray-600"}`} />
                    ) : (
                      <FaRobot className={`text-sm ${msg.sender === "user" ? "text-white" : "text-purple-600"}`} />
                    )}
                  </div>
                  <span className={`text-xs ${msg.sender === "user" ? "text-purple-200" : "text-gray-500"}`}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                {/* Message Content */}
                {(() => {
                  const parsed = tryParseJson(msg.text);

                  if (parsed) {
                    return (
                      <div className="text-sm leading-relaxed space-y-2">
                        <p>✅ تم جلب معلومات الموظف:</p>
                        <table className="w-full border-collapse border border-gray-300 text-xs">
                          <tbody>
                            {Object.entries(parsed).map(([key, value]) => (
                              <tr key={key} className="border-b">
                                <td className="border border-gray-300 px-2 py-1 font-medium bg-gray-50">{key}</td>
                                <td className="border border-gray-300 px-2 py-1">{String(value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  // إذا مش JSON عادي
                  return <p className="text-sm leading-relaxed">{msg.text}</p>;
                })()}

              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 rounded-2xl rounded-bl-none p-5 shadow-md border border-gray-100 max-w-xs lg:max-w-md">
                <div className="flex items-center">
                  <div className="bg-gray-100 p-2 rounded-full mr-2">
                    <FaRobot className="text-purple-600 text-sm" />
                  </div>
                  <ImSpinner8 className="animate-spin text-purple-500 mr-2" />
                  <span className="text-xs text-gray-500">جاري المعالجة...</span>
                </div>
                <div className="flex space-x-1 rtl:space-x-reverse mt-3">
                  <div className="h-2 w-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                  <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="max-w-3xl mx-auto mt-4">
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm text-center border border-red-100">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
        {/* File Preview */}
        {file && (
          <div className="max-w-3xl mx-auto mb-3">
            <div className="flex items-center justify-between bg-purple-50 p-3 rounded-lg border border-purple-100">
              <div className="flex items-center">
                <FaPaperclip className="text-purple-600 ml-2" />
                <span className="text-sm text-purple-800 font-medium">{file.name}</span>
                <span className="text-xs text-purple-500 mr-2">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button
                onClick={removeFile}
                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
              >
                <FaTrash size={12} />
              </button>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto flex items-center gap-3 bg-gray-100 rounded-xl p-2">
          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
            id="fileInput"
            disabled={isLoading}
          />
          <label
            htmlFor="fileInput"
            className={`cursor-pointer p-2 rounded-lg ${isLoading
              ? "text-gray-400 cursor-not-allowed"
              : "text-gray-600 hover:bg-white hover:text-purple-600"
              } transition-all duration-200`}
          >
            <FaPaperclip size={18} />
          </label>

          {/* Text Input */}
          <input
            type="text"
            placeholder="اكتب رسالتك هنا..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-transparent border-0 outline-none placeholder:text-gray-500 disabled:cursor-not-allowed"
          />

          {/* Send Button */}
          <button
            onClick={sendMessage}
            disabled={(!input && !file) || isLoading}
            className={`p-3 rounded-xl transition-all duration-200 ${(!input && !file) || isLoading
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 to-indigo-700 text-white hover:shadow-lg transform hover:scale-105"
              }`}
          >
            {isLoading ? (
              <ImSpinner8 className="animate-spin" />
            ) : (
              <FaPaperPlane />
            )}
          </button>
        </div>

        <div className="max-w-3xl mx-auto mt-2">
          <p className="text-xs text-center text-gray-500">
            الذكاء الاصطناعي قد يخطئ في بعض الأحيان. يرجى مراجعة المعلومات الهامة.
          </p>
        </div>
      </div>
    </div>
  );
}