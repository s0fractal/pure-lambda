/**
 * Type Guards - Prevent nonsense like (+ TRUE 0)
 * Static type checking at the boundary
 */

// Lambda term types
export type LambdaTerm = 
  | NumTerm
  | BoolTerm
  | PairTerm<any, any>
  | FnTerm<any, any>
  | ListTerm<any>
  | VarTerm
  | AppTerm;

export interface NumTerm {
  type: 'num';
  value: <T>(s: (x: T) => T) => (z: T) => T;  // Church numeral
}

export interface BoolTerm {
  type: 'bool';
  value: <T>(a: T) => (b: T) => T;  // Church boolean
}

export interface PairTerm<A, B> {
  type: 'pair';
  fst: LambdaTerm;
  snd: LambdaTerm;
  value: <T>(f: (a: A) => (b: B) => T) => T;
}

export interface FnTerm<A, B> {
  type: 'fn';
  param: string;
  body: LambdaTerm;
  value: (x: A) => B;
}

export interface ListTerm<T> {
  type: 'list';
  value: any;  // Church list encoding
}

export interface VarTerm {
  type: 'var';
  name: string;
}

export interface AppTerm {
  type: 'app';
  fn: LambdaTerm;
  arg: LambdaTerm;
}

// Type guards
export function isNum(term: LambdaTerm): term is NumTerm {
  return term.type === 'num';
}

export function isBool(term: LambdaTerm): term is BoolTerm {
  return term.type === 'bool';
}

export function isPair(term: LambdaTerm): term is PairTerm<any, any> {
  return term.type === 'pair';
}

export function isFn(term: LambdaTerm): term is FnTerm<any, any> {
  return term.type === 'fn';
}

export function isList(term: LambdaTerm): term is ListTerm<any> {
  return term.type === 'list';
}

export function isVar(term: LambdaTerm): term is VarTerm {
  return term.type === 'var';
}

export function isApp(term: LambdaTerm): term is AppTerm {
  return term.type === 'app';
}

// Type checking for operations
export class TypeChecker {
  private errors: string[] = [];
  
  // Check if operation is type-safe
  checkApp(fn: LambdaTerm, arg: LambdaTerm): boolean {
    // PLUS expects two numbers
    if (this.isPlusOp(fn)) {
      if (!isNum(arg)) {
        this.errors.push(`Type error: PLUS expects number, got ${arg.type}`);
        return false;
      }
      return true;
    }
    
    // AND/OR expect booleans
    if (this.isBoolOp(fn)) {
      if (!isBool(arg)) {
        this.errors.push(`Type error: Boolean operation expects bool, got ${arg.type}`);
        return false;
      }
      return true;
    }
    
    // CONS expects any + list
    if (this.isConsOp(fn)) {
      // First arg can be anything, second must be list
      return true;
    }
    
    // FST/SND expect pairs
    if (this.isPairOp(fn)) {
      if (!isPair(arg)) {
        this.errors.push(`Type error: Pair operation expects pair, got ${arg.type}`);
        return false;
      }
      return true;
    }
    
    // Generic function application
    if (isFn(fn)) {
      // Would need more sophisticated type inference here
      return true;
    }
    
    this.errors.push(`Type error: Cannot apply ${fn.type} to ${arg.type}`);
    return false;
  }
  
  // Check arithmetic operations
  checkArithmetic(op: string, left: LambdaTerm, right: LambdaTerm): boolean {
    if (!isNum(left) || !isNum(right)) {
      this.errors.push(
        `Type error: ${op} expects (Num, Num), got (${left.type}, ${right.type})`
      );
      return false;
    }
    return true;
  }
  
  // Check boolean operations
  checkBoolean(op: string, left: LambdaTerm, right: LambdaTerm): boolean {
    if (!isBool(left) || !isBool(right)) {
      this.errors.push(
        `Type error: ${op} expects (Bool, Bool), got (${left.type}, ${right.type})`
      );
      return false;
    }
    return true;
  }
  
  // Check IF expression
  checkIf(cond: LambdaTerm, then_: LambdaTerm, else_: LambdaTerm): boolean {
    if (!isBool(cond)) {
      this.errors.push(`Type error: IF condition must be Bool, got ${cond.type}`);
      return false;
    }
    // Then and else branches should have same type
    if (then_.type !== else_.type) {
      this.errors.push(
        `Type error: IF branches have different types: ${then_.type} vs ${else_.type}`
      );
      return false;
    }
    return true;
  }
  
  getErrors(): string[] {
    return this.errors;
  }
  
  clearErrors(): void {
    this.errors = [];
  }
  
  // Helper predicates
  private isPlusOp(term: LambdaTerm): boolean {
    // Would need to track PLUS identity
    return false;  // Simplified
  }
  
  private isBoolOp(term: LambdaTerm): boolean {
    // Would need to track AND/OR identity
    return false;  // Simplified
  }
  
  private isConsOp(term: LambdaTerm): boolean {
    // Would need to track CONS identity
    return false;  // Simplified
  }
  
  private isPairOp(term: LambdaTerm): boolean {
    // Would need to track FST/SND identity
    return false;  // Simplified
  }
}

// Wrap Church encodings with type information
export function wrapNum(churchNum: any): NumTerm {
  return {
    type: 'num',
    value: churchNum
  };
}

export function wrapBool(churchBool: any): BoolTerm {
  return {
    type: 'bool',
    value: churchBool
  };
}

export function wrapPair<A, B>(churchPair: any, fst: LambdaTerm, snd: LambdaTerm): PairTerm<A, B> {
  return {
    type: 'pair',
    fst,
    snd,
    value: churchPair
  };
}

export function wrapFn<A, B>(fn: (x: A) => B, param: string, body: LambdaTerm): FnTerm<A, B> {
  return {
    type: 'fn',
    param,
    body,
    value: fn
  };
}

export function wrapList<T>(churchList: any): ListTerm<T> {
  return {
    type: 'list',
    value: churchList
  };
}

// Example: Safe PLUS operation
export function safePlus(a: LambdaTerm, b: LambdaTerm): LambdaTerm | Error {
  const checker = new TypeChecker();
  
  if (!checker.checkArithmetic('PLUS', a, b)) {
    return new Error(checker.getErrors().join('; '));
  }
  
  // Safe to apply PLUS
  const result = (a as NumTerm).value((x: any) => (b as NumTerm).value(x));
  return wrapNum(result);
}

// Example: Safe IF expression
export function safeIf<T>(
  cond: LambdaTerm,
  then_: LambdaTerm,
  else_: LambdaTerm
): LambdaTerm | Error {
  const checker = new TypeChecker();
  
  if (!checker.checkIf(cond, then_, else_)) {
    return new Error(checker.getErrors().join('; '));
  }
  
  // Safe to apply IF
  const result = (cond as BoolTerm).value(then_)(else_);
  return result;
}