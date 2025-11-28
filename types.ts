export interface Point {
  x: number;
  y: number;
}

export interface MathFunction {
  id: string;
  name: string;
  formula: string; // Display string
  fn: (x: number, y: number) => number; // Calculate Z
  gradient: (x: number, y: number) => { dx: number; dy: number }; // Calculate partial derivatives
  description: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
