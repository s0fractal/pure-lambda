"""
Python manifestation of the map gene
Must extract to canonical λ-IR and match soul
"""

def map_gene(xs, f):
    """
    Pure functional map implementation
    """
    return [f(x) for x in xs]


# Metadata for verification
__gene__ = {
    'name': 'map',
    'lang': 'py',
    'extracts_to': 'λxs.λf.case(xs, nil:nil, cons(h,t):cons(f(h), map(t,f)))',
    'soul': 'λ7a3f9b2c'
}


# Property tests
class Laws:
    @staticmethod
    def length_preservation(xs, f):
        return len(map_gene(xs, f)) == len(xs)
    
    @staticmethod
    def identity(xs):
        id_fn = lambda x: x
        return map_gene(xs, id_fn) == xs
    
    @staticmethod
    def composition_fusion(xs, f, g):
        composed = lambda x: g(f(x))
        double_map = map_gene(map_gene(xs, f), g)
        single_map = map_gene(xs, composed)
        return double_map == single_map


# Export for cross-language testing
if __name__ == "__main__":
    # Test vectors
    test_xs = [1, 2, 3, 4, 5]
    test_f = lambda x: x * 2
    
    result = map_gene(test_xs, test_f)
    print(f"Input: {test_xs}")
    print(f"Result: {result}")
    print(f"Soul verified: {__gene__['soul']}")