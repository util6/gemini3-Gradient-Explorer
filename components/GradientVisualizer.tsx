
import React, { useRef, useEffect, useState, MouseEvent } from 'react';
import * as d3 from 'd3-scale';
import { interpolateTurbo } from 'd3-scale-chromatic';
import { MathFunction, Point } from '../types';
import { CANVAS_SIZE, GRID_SCALE, AXIS_RANGE } from '../constants';

interface GradientVisualizerProps {
  activeFunction: MathFunction;
  userPoint: Point;
  setUserPoint: (p: Point) => void;
  showVectors: boolean;
  showHeatmap: boolean;
}

const GradientVisualizer: React.FC<GradientVisualizerProps> = ({
  activeFunction,
  userPoint,
  setUserPoint,
  showVectors,
  showHeatmap
}) => {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Helper: Convert Math Coordinates to Canvas Coordinates
  const toCanvas = (val: number) => (val + AXIS_RANGE) * GRID_SCALE;
  // Helper: Convert Canvas Coordinates to Math Coordinates
  const toMath = (val: number) => (val / GRID_SCALE) - AXIS_RANGE;

  // 1. Draw Static Background (Heatmap + Grid Vector Field)
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // --- A. Draw Heatmap (Scalar Field) ---
    if (showHeatmap) {
      const imageData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
      const data = imageData.data;
      
      // Determine min/max z for color scaling locally to get good contrast
      // In a real app we might pre-calculate this or clamp it.
      // For these functions, z is usually between -10 and 10 within range.
      const colorScale = d3.scaleSequential(interpolateTurbo).domain([-4, 4]);

      for (let py = 0; py < CANVAS_SIZE; py++) {
        for (let px = 0; px < CANVAS_SIZE; px++) {
          const x = toMath(px);
          const y = -toMath(py); // Invert Y for math coords (up is positive)
          let z = activeFunction.fn(x, y);
          
          // Safety check for NaN
          if (isNaN(z)) z = 0;

          const colorStr = colorScale(z); 
          // Parse rgb string from d3 to populate imageData is slow, 
          // but for initialization it's acceptable. 
          // Optimization: d3 returns "rgb(r, g, b)", we parse it.
          const rgbMatch = colorStr.match(/\d+/g);
          if (rgbMatch) {
            const index = (py * CANVAS_SIZE + px) * 4;
            data[index] = parseInt(rgbMatch[0]);     // R
            data[index + 1] = parseInt(rgbMatch[1]); // G
            data[index + 2] = parseInt(rgbMatch[2]); // B
            data[index + 3] = 255;                   // Alpha
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
    } else {
      // Dark background if no heatmap
      ctx.fillStyle = '#1e293b'; // Slate 800
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    // --- B. Draw Grid Lines ---
    ctx.strokeStyle = showHeatmap ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Vertical & Horizontal lines passing through 0
    const originX = toCanvas(0);
    const originY = toCanvas(0); // Note: Y axis flip handled in toMath/toCanvas logic usually requires care
    
    // Draw grid
    for (let i = -Math.floor(AXIS_RANGE); i <= Math.ceil(AXIS_RANGE); i++) {
      const pos = toCanvas(i);
      // Vertical
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, CANVAS_SIZE);
      // Horizontal
      ctx.moveTo(0, pos);
      ctx.lineTo(CANVAS_SIZE, pos);
    }
    ctx.stroke();

    // Draw Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, CANVAS_SIZE);
    ctx.moveTo(0, originX); // Since square, originX == originY
    ctx.lineTo(CANVAS_SIZE, originX);
    ctx.stroke();

    // --- C. Draw Vector Field ---
    if (showVectors) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      const step = 1; // Math units step
      
      for (let x = -Math.floor(AXIS_RANGE) + 0.5; x < AXIS_RANGE; x += step) {
        for (let y = -Math.floor(AXIS_RANGE) + 0.5; y < AXIS_RANGE; y += step) {
          const cx = toCanvas(x);
          const cy = toCanvas(-y); // Canvas Y is inverted
          
          const grad = activeFunction.gradient(x, y);
          let len = Math.sqrt(grad.dx ** 2 + grad.dy ** 2);
          
          // Safety check for NaN
          if (isNaN(len)) len = 0;

          if (len > 0.01) {
            // Normalize for display length, but maybe scale by magnitude slightly
            // Visual length = fixed * sigmoid(len) to prevent huge arrows
            const displayLen = 20 * (len / (len + 1)); 
            const angle = Math.atan2(-grad.dy, grad.dx); // Canvas Y inverted implies -dy

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            
            // Arrow shaft
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(displayLen, 0);
            ctx.stroke();
            
            // Arrow head
            ctx.beginPath();
            ctx.moveTo(displayLen, 0);
            ctx.lineTo(displayLen - 4, -3);
            ctx.lineTo(displayLen - 4, 3);
            ctx.fill();
            
            ctx.restore();
          }
        }
      }
    }

  }, [activeFunction, showVectors, showHeatmap]);

  // 2. Draw Foreground (Interactive Elements)
  useEffect(() => {
    const canvas = fgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const cx = toCanvas(userPoint.x);
    const cy = toCanvas(-userPoint.y);

    // --- A. Draw Gradient at Point ---
    const grad = activeFunction.gradient(userPoint.x, userPoint.y);
    let gradLen = Math.sqrt(grad.dx ** 2 + grad.dy ** 2);
    
    if (isNaN(gradLen)) gradLen = 0;

    // We draw the actual gradient vector, scaled up slightly for visibility
    // In math: Gradient points in direction of steepest ascent.
    if (gradLen > 0.001) {
      const scaleFactor = 40; // Pixels per unit gradient magnitude
      const dxPx = grad.dx * scaleFactor;
      const dyPx = -grad.dy * scaleFactor; // Canvas Y inverted

      ctx.strokeStyle = '#fbbf24'; // Amber 400 (Gold)
      ctx.fillStyle = '#fbbf24';
      ctx.lineWidth = 3;

      ctx.save();
      ctx.translate(cx, cy);
      
      // Draw Vector
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dxPx, dyPx);
      ctx.stroke();

      // Draw Head
      const angle = Math.atan2(dyPx, dxPx);
      const headLen = 8;
      ctx.translate(dxPx, dyPx);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-headLen, -headLen/2);
      ctx.lineTo(-headLen, headLen/2);
      ctx.fill();

      ctx.restore();
    }

    // --- B. Draw User Point ---
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // --- C. Draw Tooltip text nearby ---
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`(${userPoint.x.toFixed(2)}, ${userPoint.y.toFixed(2)})`, cx + 10, cy - 10);

  }, [userPoint, activeFunction]);

  // Interaction Handlers
  const handleInteraction = (clientX: number, clientY: number) => {
    const canvas = fgCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    let x = toMath(px);
    let y = -toMath(py); // Invert back

    // Clamp to bounds
    x = Math.max(-AXIS_RANGE, Math.min(AXIS_RANGE, x));
    y = Math.max(-AXIS_RANGE, Math.min(AXIS_RANGE, y));

    setUserPoint({ x, y });
  };

  const onMouseDown = (e: MouseEvent) => {
    setIsDragging(true);
    handleInteraction(e.clientX, e.clientY);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      handleInteraction(e.clientX, e.clientY);
    }
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="relative rounded-xl overflow-hidden shadow-2xl border border-slate-700">
      {/* Background Canvas (Static) */}
      <canvas
        ref={bgCanvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="absolute top-0 left-0 bg-slate-900"
      />
      {/* Foreground Canvas (Interactive) */}
      <canvas
        ref={fgCanvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="relative z-10 cursor-crosshair touch-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />
      <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur px-3 py-2 rounded border border-slate-600 text-xs text-slate-300 pointer-events-none">
        拖动白点以移动位置
      </div>
    </div>
  );
};

export default GradientVisualizer;
