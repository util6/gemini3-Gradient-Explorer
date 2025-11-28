
// Utility to compile a math string into a JS function
export const compileUserFunction = (expression: string): ((x: number, y: number) => number) | null => {
  try {
    if (!expression.trim()) return null;

    // 1. Basic preprocessing
    let jsExpr = expression.toLowerCase();

    // 2. Replacements for math syntax to JS syntax
    const replacements: [RegExp, string][] = [
      [/\^/g, '**'],                // Powers: x^2 -> x**2
      [/\bsin\b/g, 'Math.sin'],
      [/\bcos\b/g, 'Math.cos'],
      [/\btan\b/g, 'Math.tan'],
      [/\bsqrt\b/g, 'Math.sqrt'],
      [/\babs\b/g, 'Math.abs'],
      [/\blog\b/g, 'Math.log'],
      [/\bln\b/g, 'Math.log'],
      [/\bexp\b/g, 'Math.exp'],
      [/\bpi\b/g, 'Math.PI'],
      [/\be\b/g, 'Math.E'],
    ];

    replacements.forEach(([regex, replace]) => {
      jsExpr = jsExpr.replace(regex, replace);
    });

    // 3. Create function safely
    // wrapping in try-catch block inside to prevent runtime crashes during evaluation
    const fnBody = `
      try {
        return (${jsExpr});
      } catch (e) {
        return NaN;
      }
    `;
    
    return new Function('x', 'y', fnBody) as (x: number, y: number) => number;
  } catch (e) {
    console.error("Compilation error:", e);
    return null;
  }
};

// Numerical Gradient Calculation using Finite Differences
// Approximates derivative for any black-box function
export const getNumericalGradient = (
  fn: (x: number, y: number) => number, 
  x: number, 
  y: number, 
  epsilon = 1e-4
) => {
  const z = fn(x, y);
  if (isNaN(z)) return { dx: 0, dy: 0 };

  const f_x_plus = fn(x + epsilon, y);
  const f_x_minus = fn(x - epsilon, y);
  
  const f_y_plus = fn(x, y + epsilon);
  const f_y_minus = fn(x, y - epsilon);

  // Central difference formula
  const dx = (f_x_plus - f_x_minus) / (2 * epsilon);
  const dy = (f_y_plus - f_y_minus) / (2 * epsilon);

  return {
    dx: isNaN(dx) ? 0 : dx,
    dy: isNaN(dy) ? 0 : dy
  };
};
