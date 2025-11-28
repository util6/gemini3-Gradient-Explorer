import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const askMathTutor = async (
  question: string,
  context: { functionName: string; formula: string; currentPoint: { x: number; y: number } }
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "请先配置 API Key 才能使用 AI 导师功能。";

  const systemInstruction = `
    你是一位世界级的数学导师，擅长用直观、生动且类似 3Blue1Brown 的风格解释微积分概念。
    
    当前的上下文：
    - 正在探索的函数：${context.functionName}
    - 公式：${context.formula}
    - 学生当前鼠标位置：x=${context.currentPoint.x.toFixed(2)}, y=${context.currentPoint.y.toFixed(2)}

    请用中文回答。回答要简洁、深刻，尽量通过几何直觉而不是复杂的代数推导来解释。
    重点解释"梯度" (Gradient) 的概念：它是指向函数增长最快方向的向量，其长度代表增长率。
    如果学生问到特定点的情况，请结合该点的坐标进行分析。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: question,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    
    return response.text || "抱歉，我无法理解这个问题。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 服务暂时不可用，请稍后再试。";
  }
};
