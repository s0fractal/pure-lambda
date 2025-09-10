/*!
 * Rust manifestation of the map gene
 * Must extract to canonical λ-IR and match soul
 */

/// Pure functional map implementation
pub fn map<A, B, F>(xs: Vec<A>, f: F) -> Vec<B>
where
    F: Fn(A) -> B,
{
    xs.into_iter().map(f).collect()
}

/// Alternative implementation showing semantic equivalence
pub fn map_explicit<A, B, F>(xs: Vec<A>, f: F) -> Vec<B>
where
    F: Fn(A) -> B,
{
    let mut result = Vec::with_capacity(xs.len());
    for x in xs {
        result.push(f(x));
    }
    result
}

/// Gene metadata
pub const GENE_NAME: &str = "map";
pub const GENE_LANG: &str = "rs";
pub const GENE_SOUL: &str = "λ7a3f9b2c";
pub const LAMBDA_IR: &str = "λxs.λf.case(xs, nil:nil, cons(h,t):cons(f(h), map(t,f)))";

/// Property tests
#[cfg(test)]
mod laws {
    use super::*;

    #[test]
    fn length_preservation() {
        let xs = vec![1, 2, 3, 4, 5];
        let f = |x| x * 2;
        let result = map(xs.clone(), f);
        assert_eq!(result.len(), xs.len());
    }

    #[test]
    fn identity_law() {
        let xs = vec![1, 2, 3, 4, 5];
        let id = |x| x;
        let result = map(xs.clone(), id);
        assert_eq!(result, xs);
    }

    #[test]
    fn composition_fusion() {
        let xs = vec![1, 2, 3];
        let f = |x| x * 2;
        let g = |x| x + 1;
        
        let double_map = map(map(xs.clone(), f), g);
        let single_map = map(xs, |x| g(f(x)));
        
        assert_eq!(double_map, single_map);
    }
}