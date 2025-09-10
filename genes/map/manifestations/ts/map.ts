/**
 * TypeScript manifestation of the map gene
 * Must extract to canonical λ-IR and match soul
 */

export function map<A, B>(xs: A[], f: (a: A) => B): B[] {
  const result = new Array<B>(xs.length);
  for (let i = 0; i < xs.length; i++) {
    result[i] = f(xs[i]);
  }
  return result;
}

// Metadata for verification
export const __gene = {
  name: 'map',
  lang: 'ts',
  extractsTo: 'λxs.λf.case(xs, nil:nil, cons(h,t):cons(f(h), map(t,f)))',
  soul: 'λ7a3f9b2c'
};

// Property tests
export const __laws = {
  lengthPreservation: <A, B>(xs: A[], f: (a: A) => B) => {
    return map(xs, f).length === xs.length;
  },
  
  identity: <A>(xs: A[]) => {
    const id = (x: A) => x;
    return JSON.stringify(map(xs, id)) === JSON.stringify(xs);
  },
  
  compositionFusion: <A, B, C>(xs: A[], f: (a: A) => B, g: (b: B) => C) => {
    const composed = (x: A) => g(f(x));
    const doubleMap = map(map(xs, f), g);
    const singleMap = map(xs, composed);
    return JSON.stringify(doubleMap) === JSON.stringify(singleMap);
  }
};