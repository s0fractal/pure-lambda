/**
 * Transpiler - All syntactic sugar becomes pure lambda
 * let/const/if/for → λ abstractions
 */

export type JSExpr = 
  | { type: 'let'; name: string; value: JSExpr; body: JSExpr }
  | { type: 'const'; name: string; value: JSExpr; body: JSExpr }
  | { type: 'if'; cond: JSExpr; then: JSExpr; else: JSExpr }
  | { type: 'var'; name: string }
  | { type: 'num'; value: number }
  | { type: 'bool'; value: boolean }
  | { type: 'fn'; params: string[]; body: JSExpr }
  | { type: 'app'; fn: JSExpr; args: JSExpr[] }
  | { type: 'binop'; op: string; left: JSExpr; right: JSExpr }
  | { type: 'for'; init: JSExpr; cond: JSExpr; update: JSExpr; body: JSExpr }
  | { type: 'while'; cond: JSExpr; body: JSExpr }
  | { type: 'array'; elements: JSExpr[] }
  | { type: 'object'; fields: { [key: string]: JSExpr } };

export type LambdaExpr =
  | { type: 'λ'; param: string; body: LambdaExpr }
  | { type: 'app'; fn: LambdaExpr; arg: LambdaExpr }
  | { type: 'var'; name: string }
  | { type: 'church_num'; n: number }
  | { type: 'church_bool'; b: boolean }
  | { type: 'Y'; body: LambdaExpr };

/**
 * Desugar JavaScript to pure lambda calculus
 */
export function desugar(expr: JSExpr): LambdaExpr {
  switch (expr.type) {
    case 'let':
    case 'const':
      // let x = e; body → (λx. body)(e)
      return {
        type: 'app',
        fn: {
          type: 'λ',
          param: expr.name,
          body: desugar(expr.body)
        },
        arg: desugar(expr.value)
      };
    
    case 'if':
      // if (c) t else e → IF c (λ_.t) (λ_.e)
      return {
        type: 'app',
        fn: {
          type: 'app',
          fn: {
            type: 'app',
            fn: { type: 'var', name: 'IF' },
            arg: desugar(expr.cond)
          },
          arg: {
            type: 'λ',
            param: '_',
            body: desugar(expr.then)
          }
        },
        arg: {
          type: 'λ',
          param: '_',
          body: desugar(expr.else)
        }
      };
    
    case 'fn':
      // Multi-param function → curried lambdas
      // (x, y, z) => body → λx. λy. λz. body
      if (expr.params.length === 0) {
        return { type: 'λ', param: '_', body: desugar(expr.body) };
      }
      
      let result = desugar(expr.body);
      for (let i = expr.params.length - 1; i >= 0; i--) {
        result = {
          type: 'λ',
          param: expr.params[i],
          body: result
        };
      }
      return result;
    
    case 'app':
      // Multi-arg application → curried applications
      // f(a, b, c) → (((f a) b) c)
      if (expr.args.length === 0) {
        return {
          type: 'app',
          fn: desugar(expr.fn),
          arg: { type: 'var', name: 'NIL' }
        };
      }
      
      let app = desugar(expr.fn);
      for (const arg of expr.args) {
        app = {
          type: 'app',
          fn: app,
          arg: desugar(arg)
        };
      }
      return app;
    
    case 'binop':
      // Binary operations → function applications
      // a + b → PLUS a b
      const opMap: { [key: string]: string } = {
        '+': 'PLUS',
        '*': 'MULT',
        '-': 'MINUS',
        '&&': 'AND',
        '||': 'OR',
        '==': 'EQ',
        '<': 'LT',
        '>': 'GT'
      };
      
      const op = opMap[expr.op] || expr.op;
      return {
        type: 'app',
        fn: {
          type: 'app',
          fn: { type: 'var', name: op },
          arg: desugar(expr.left)
        },
        arg: desugar(expr.right)
      };
    
    case 'for':
      // for loop → recursive function with Y combinator
      // for (init; cond; update) body →
      // (λ_. init) (Y (λf. λ_. IF cond (λ_. body; update; f NIL) (λ_. NIL)))
      return {
        type: 'app',
        fn: {
          type: 'λ',
          param: '_',
          body: desugar(expr.init)
        },
        arg: {
          type: 'app',
          fn: {
            type: 'Y',
            body: {
              type: 'λ',
              param: 'f',
              body: {
                type: 'λ',
                param: '_',
                body: {
                  type: 'app',
                  fn: {
                    type: 'app',
                    fn: {
                      type: 'app',
                      fn: { type: 'var', name: 'IF' },
                      arg: desugar(expr.cond)
                    },
                    arg: {
                      type: 'λ',
                      param: '_',
                      body: {
                        type: 'app',
                        fn: {
                          type: 'λ',
                          param: '_',
                          body: {
                            type: 'app',
                            fn: {
                              type: 'λ',
                              param: '_',
                              body: {
                                type: 'app',
                                fn: { type: 'var', name: 'f' },
                                arg: { type: 'var', name: 'NIL' }
                              }
                            },
                            arg: desugar(expr.update)
                          }
                        },
                        arg: desugar(expr.body)
                      }
                    }
                  },
                  arg: {
                    type: 'λ',
                    param: '_',
                    body: { type: 'var', name: 'NIL' }
                  }
                }
              }
            }
          },
          arg: { type: 'var', name: 'NIL' }
        }
      };
    
    case 'while':
      // while loop → Y combinator
      // while (cond) body → Y (λf. λ_. IF cond (λ_. body; f NIL) (λ_. NIL))
      return {
        type: 'app',
        fn: {
          type: 'Y',
          body: {
            type: 'λ',
            param: 'f',
            body: {
              type: 'λ',
              param: '_',
              body: {
                type: 'app',
                fn: {
                  type: 'app',
                  fn: {
                    type: 'app',
                    fn: { type: 'var', name: 'IF' },
                    arg: desugar(expr.cond)
                  },
                  arg: {
                    type: 'λ',
                    param: '_',
                    body: {
                      type: 'app',
                      fn: {
                        type: 'λ',
                        param: '_',
                        body: {
                          type: 'app',
                          fn: { type: 'var', name: 'f' },
                          arg: { type: 'var', name: 'NIL' }
                        }
                      },
                      arg: desugar(expr.body)
                    }
                  }
                },
                arg: {
                  type: 'λ',
                  param: '_',
                  body: { type: 'var', name: 'NIL' }
                }
              }
            }
          }
        },
        arg: { type: 'var', name: 'NIL' }
      };
    
    case 'array':
      // [a, b, c] → CONS a (CONS b (CONS c NIL))
      let list: LambdaExpr = { type: 'var', name: 'NIL' };
      for (let i = expr.elements.length - 1; i >= 0; i--) {
        list = {
          type: 'app',
          fn: {
            type: 'app',
            fn: { type: 'var', name: 'CONS' },
            arg: desugar(expr.elements[i])
          },
          arg: list
        };
      }
      return list;
    
    case 'object':
      // {a: 1, b: 2} → Church-encoded record (complex)
      // Simplified: treat as list of pairs
      const pairs: LambdaExpr[] = [];
      for (const [key, value] of Object.entries(expr.fields)) {
        pairs.push({
          type: 'app',
          fn: {
            type: 'app',
            fn: { type: 'var', name: 'PAIR' },
            arg: { type: 'var', name: key }  // Use key as symbol
          },
          arg: desugar(value)
        });
      }
      
      let obj: LambdaExpr = { type: 'var', name: 'NIL' };
      for (let i = pairs.length - 1; i >= 0; i--) {
        obj = {
          type: 'app',
          fn: {
            type: 'app',
            fn: { type: 'var', name: 'CONS' },
            arg: pairs[i]
          },
          arg: obj
        };
      }
      return obj;
    
    case 'num':
      return { type: 'church_num', n: expr.value };
    
    case 'bool':
      return { type: 'church_bool', b: expr.value };
    
    case 'var':
      return { type: 'var', name: expr.name };
  }
}

/**
 * Pretty-print lambda expression
 */
export function prettyPrint(expr: LambdaExpr): string {
  switch (expr.type) {
    case 'λ':
      return `(λ${expr.param}. ${prettyPrint(expr.body)})`;
    
    case 'app':
      return `(${prettyPrint(expr.fn)} ${prettyPrint(expr.arg)})`;
    
    case 'var':
      return expr.name;
    
    case 'church_num':
      return `[${expr.n}]`;  // Church numeral marker
    
    case 'church_bool':
      return expr.b ? 'TRUE' : 'FALSE';
    
    case 'Y':
      return `(Y ${prettyPrint(expr.body)})`;
  }
}

/**
 * Example transformations
 */
export function examples() {
  // let x = 5; x + 1
  const letExample: JSExpr = {
    type: 'let',
    name: 'x',
    value: { type: 'num', value: 5 },
    body: {
      type: 'binop',
      op: '+',
      left: { type: 'var', name: 'x' },
      right: { type: 'num', value: 1 }
    }
  };
  
  console.log('let x = 5; x + 1');
  console.log('→', prettyPrint(desugar(letExample)));
  
  // if (true) 1 else 0
  const ifExample: JSExpr = {
    type: 'if',
    cond: { type: 'bool', value: true },
    then: { type: 'num', value: 1 },
    else: { type: 'num', value: 0 }
  };
  
  console.log('\nif (true) 1 else 0');
  console.log('→', prettyPrint(desugar(ifExample)));
  
  // (x, y) => x + y
  const fnExample: JSExpr = {
    type: 'fn',
    params: ['x', 'y'],
    body: {
      type: 'binop',
      op: '+',
      left: { type: 'var', name: 'x' },
      right: { type: 'var', name: 'y' }
    }
  };
  
  console.log('\n(x, y) => x + y');
  console.log('→', prettyPrint(desugar(fnExample)));
}