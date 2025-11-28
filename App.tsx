
import React, { useState, useRef, useEffect, useMemo } from 'react';
import GradientVisualizer from './components/GradientVisualizer';
import { MATH_FUNCTIONS } from './constants';
import { MathFunction, Point, ChatMessage } from './types';
import { askMathTutor } from './services/geminiService';
import { compileUserFunction, getNumericalGradient } from './utils';

export default function App() {
  const [activeFuncId, setActiveFuncId] = useState<string>(MATH_FUNCTIONS[0].id);
  const [userPoint, setUserPoint] = useState<Point>({ x: 1, y: 1 });
  const [showVectors, setShowVectors] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  
  // Custom Function State
  const [customFormula, setCustomFormula] = useState('sin(x) * y');
  const [customFnError, setCustomFnError] = useState<string | null>(null);

  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'model', text: '你好！我是你的数学导师。试着移动左侧图像中的点，观察"梯度"箭头的变化。你也可以尝试输入自定义函数！', timestamp: Date.now() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Construct the active function object dynamically
  const activeFunction: MathFunction = useMemo(() => {
    if (activeFuncId === 'custom') {
      const compiled = compileUserFunction(customFormula);
      if (!compiled) {
        // Fallback or error state
        return {
          id: 'custom',
          name: '自定义函数',
          formula: customFormula,
          fn: () => 0,
          gradient: () => ({ dx: 0, dy: 0 }),
          description: '用户自定义的函数曲面。'
        };
      }
      return {
        id: 'custom',
        name: '自定义函数',
        formula: `f(x, y) = ${customFormula}`,
        fn: compiled,
        gradient: (x, y) => getNumericalGradient(compiled, x, y),
        description: '你正在探索自己定义的数学地形！'
      };
    }
    return MATH_FUNCTIONS.find(f => f.id === activeFuncId) || MATH_FUNCTIONS[0];
  }, [activeFuncId, customFormula]);

  // Derived values for display
  const currentZ = activeFunction.fn(userPoint.x, userPoint.y);
  const currentGrad = activeFunction.gradient(userPoint.x, userPoint.y);
  const gradMagnitude = Math.sqrt(currentGrad.dx ** 2 + currentGrad.dy ** 2);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isAiLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiLoading(true);

    try {
      const responseText = await askMathTutor(userMsg.text, {
        functionName: activeFunction.name,
        formula: activeFunction.formula,
        currentPoint: userPoint
      });
      
      const aiMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
      setChatHistory(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">
              ∇
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Gradient Explorer <span className="text-slate-500 font-normal text-sm ml-2">交互式梯度教学</span>
            </h1>
          </div>
          <div className="text-xs text-slate-500 font-mono hidden md:block">
            Powered by Gemini 2.5
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Controls & Function List (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">选择函数曲面</h2>
            <div className="space-y-2">
              {MATH_FUNCTIONS.map(fn => (
                <button
                  key={fn.id}
                  onClick={() => setActiveFuncId(fn.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all border ${
                    activeFuncId === fn.id 
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200' 
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="font-medium">{fn.name}</div>
                  <div className="text-xs opacity-70 font-mono mt-1">{fn.formula}</div>
                </button>
              ))}
              
              {/* Custom Function Button */}
              <button
                onClick={() => setActiveFuncId('custom')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all border ${
                  activeFuncId === 'custom' 
                    ? 'bg-purple-600/20 border-purple-500/50 text-purple-200' 
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="font-medium flex items-center justify-between">
                  自定义函数
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">Beta</span>
                </div>
                <div className="text-xs opacity-70 font-mono mt-1">f(x, y) = ...</div>
              </button>
            </div>
            
            {/* Custom Function Input Area */}
            {activeFuncId === 'custom' && (
              <div className="mt-4 pt-4 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2">
                <label className="text-xs text-purple-400 font-mono mb-1 block">输入公式 f(x, y) =</label>
                <input 
                  type="text" 
                  value={customFormula}
                  onChange={(e) => setCustomFormula(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 font-mono text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                  placeholder="例如: sin(x) * y"
                />
                <div className="text-[10px] text-slate-500 mt-2 leading-normal">
                  支持: <code className="bg-slate-800 px-1 rounded">sin</code>, <code className="bg-slate-800 px-1 rounded">cos</code>, <code className="bg-slate-800 px-1 rounded">sqrt</code>, <code className="bg-slate-800 px-1 rounded">^</code> (平方).<br/>
                  注意：乘法请用 <code className="bg-slate-800 px-1 rounded">*</code>
                </div>
              </div>
            )}

          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">显示设置</h2>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-slate-300 group-hover:text-white transition-colors">热力图 (Scalar Field)</span>
                <div 
                  className={`w-11 h-6 flex items-center bg-slate-700 rounded-full p-1 duration-300 ease-in-out ${showHeatmap ? 'bg-indigo-500' : ''}`}
                  onClick={() => setShowHeatmap(!showHeatmap)}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${showHeatmap ? 'translate-x-5' : ''}`}></div>
                </div>
              </label>
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-slate-300 group-hover:text-white transition-colors">向量场 (Vector Field)</span>
                <div 
                  className={`w-11 h-6 flex items-center bg-slate-700 rounded-full p-1 duration-300 ease-in-out ${showVectors ? 'bg-indigo-500' : ''}`}
                  onClick={() => setShowVectors(!showVectors)}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${showVectors ? 'translate-x-5' : ''}`}></div>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
             <h3 className="text-indigo-400 font-medium mb-2">当前函数说明</h3>
             <p className="text-sm text-slate-400 leading-relaxed">
               {activeFunction.description}
             </p>
          </div>
        </div>

        {/* Center Column: Visualization (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <GradientVisualizer 
            activeFunction={activeFunction}
            userPoint={userPoint}
            setUserPoint={setUserPoint}
            showVectors={showVectors}
            showHeatmap={showHeatmap}
          />
          
          {/* Math Info Panel */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-lg">
             <div className="flex-1 text-center sm:text-left">
               <div className="text-slate-500 text-xs font-mono mb-1">POSITION</div>
               <div className="font-mono text-xl text-slate-200">
                 (<span className="text-indigo-400">{userPoint.x.toFixed(2)}</span>, <span className="text-indigo-400">{userPoint.y.toFixed(2)}</span>)
               </div>
               <div className="text-slate-500 text-xs font-mono mt-1">
                 HEIGHT z = {isNaN(currentZ) ? 'NaN' : currentZ.toFixed(2)}
               </div>
             </div>

             <div className="h-10 w-px bg-slate-700 hidden sm:block"></div>

             <div className="flex-1 text-center sm:text-left">
               <div className="text-slate-500 text-xs font-mono mb-1">GRADIENT VECTOR (∇f)</div>
               <div className="font-mono text-xl text-yellow-400">
                 ⟨{isNaN(currentGrad.dx) ? '?' : currentGrad.dx.toFixed(2)}, {isNaN(currentGrad.dy) ? '?' : currentGrad.dy.toFixed(2)}⟩
               </div>
               <div className="text-slate-500 text-xs font-mono mt-1">MAGNITUDE |∇f| = {isNaN(gradMagnitude) ? '?' : gradMagnitude.toFixed(2)}</div>
             </div>
          </div>
        </div>

        {/* Right Column: AI Tutor (3 cols) */}
        <div className="lg:col-span-3 flex flex-col h-[600px] lg:h-auto bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
          <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <h2 className="font-semibold text-slate-200">AI 数学导师</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-slate-800 text-slate-300 rounded-bl-none border border-slate-700'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isAiLoading && (
              <div className="flex justify-start">
                 <div className="bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 border border-slate-700 flex gap-2 items-center">
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-200"></span>
                 </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-slate-700 bg-slate-900">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="问一些关于梯度的问题..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
              />
              <button 
                onClick={handleSendMessage}
                disabled={isAiLoading || !chatInput.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z"/>
                  <path d="M22 2 11 13"/>
                </svg>
              </button>
            </div>
            <div className="text-[10px] text-slate-600 mt-2 text-center">
              AI 可能会犯错。请结合图像验证结果。
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
