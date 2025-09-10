/**
 * TypeScript manifestation of the filter gene
 * Must extract to canonical λ-IR and match soul
 */

export function filter<A>(xs: A[], predicate: (a: A) => boolean): A[] {
  const result: A[] = [];
  for (let i = 0; i < xs.length; i++) {
    if (predicate(xs[i])) {
      result.push(xs[i]);
    }
  }
  return result;
}

// Metadata for verification
export const __gene = {
  name: 'filter',
  lang: 'ts',
  extractsTo: 'λxs.λpred.case(xs, nil:nil, cons(h,t):if(pred(h), cons(h,filter(t,pred)), filter(t,pred)))',
  soul: 'λ9c4e8a1f'
};

// Property tests
export const __laws = {
  subsetProperty: <A>(xs: A[], predicate: (a: A) => boolean) => {
    const filtered = filter(xs, predicate);
    return filtered.every(x => xs.includes(x));
  },
  
  orderPreservation: <A>(xs: A[], predicate: (a: A) => boolean) => {
    const filtered = filter(xs, predicate);
    let lastIndex = -1;
    for (const item of filtered) {
      const currentIndex = xs.indexOf(item);
      if (currentIndex <= lastIndex) return false;
      lastIndex = currentIndex;
    }
    return true;
  },
  
  predicateConsistency: <A>(xs: A[], predicate: (a: A) => boolean) => {
    const filtered = filter(xs, predicate);
    return filtered.every(predicate);
  }
};