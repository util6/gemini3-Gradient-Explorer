import { MathFunction } from './types';

// Mathematical Functions Definition
export const MATH_FUNCTIONS: MathFunction[] = [
  {
    id: 'peak',
    name: '山峰 (The Peak)',
    formula: 'f(x, y) = 4 - (x² + y²)/4',
    description: '一个简单的抛物面，梯度总是指向山顶（最大值）。',
    fn: (x, y) => 4 - (x * x + y * y) / 4,
    gradient: (x, y) => ({
      dx: -x / 2,
      dy: -y / 2
    })
  },
  {
    id: 'saddle',
    name: '马鞍面 (The Saddle)',
    formula: 'f(x, y) = (x² - y²)/4',
    description: '在一个方向上升，另一个方向下降。梯度流向像马鞍的形状。',
    fn: (x, y) => (x * x - y * y) / 4,
    gradient: (x, y) => ({
      dx: x / 2,
      dy: -y / 2
    })
  },
  {
    id: 'waves',
    name: '波浪 (Waves)',
    formula: 'f(x, y) = sin(x) · cos(y)',
    description: '周期性的波峰和波谷，展示梯度的周期性变化。',
    fn: (x, y) => Math.sin(x) * Math.cos(y),
    gradient: (x, y) => ({
      dx: Math.cos(x) * Math.cos(y),
      dy: -Math.sin(x) * Math.sin(y)
    })
  },
  {
    id: 'complex',
    name: '多峰混合 (Multi-Peak)',
    formula: 'f(x,y) = sin(x) + sin(y) + ...',
    description: '更复杂的地形，包含多个局部极大值和极小值。',
    fn: (x, y) => Math.sin(x / 1.5) + Math.cos(y / 1.5) + 0.1 * x,
    gradient: (x, y) => ({
      dx: (1 / 1.5) * Math.cos(x / 1.5) + 0.1,
      dy: -(1 / 1.5) * Math.sin(y / 1.5)
    })
  }
];

export const CANVAS_SIZE = 600;
export const GRID_SCALE = 40; // Pixels per unit
export const AXIS_RANGE = 7.5; // From -7.5 to 7.5
