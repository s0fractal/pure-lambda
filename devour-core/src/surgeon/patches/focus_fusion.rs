/// FOCUS Fusion - The laser gets sharper when stacked
/// Two FOCUS operations compose into one with AND'd predicates
///
/// This is the "laser through laser" property we discovered

use crate::ir::IR;
use crate::surgeon::egraph::Rewrite;

/// FOCUS fusion law - proven in FOCUS.md
pub fn focus_fusion() -> Rewrite {
    Rewrite {
        name: "focus_fusion".to_string(),
        pattern: r#"
            (focus 
              (focus ?xs ?w1 ?f1 ?g1)
              ?w2 ?f2 ?g2)
        "#,
        replacement: r#"
            (focus ?xs 
              (and ?w1 ?w2)           // Weights multiply (AND)
              (compose ?f2 ?f1)       // Transforms compose  
              (or ?g1 ?g2))          // Drops combine (OR)
        "#,
        cost_delta: -200,  // Eliminates entire pass
    }
}

/// ROI + FOCUS = Ultimate speedup
pub fn roi_focus_fusion() -> Rewrite {
    Rewrite {
        name: "roi_focus_100x".to_string(),
        pattern: r#"
            (map ?f 
              (filter ?p 
                (slice ?xs ?roi)))
        "#,
        replacement: r#"
            (focus ?xs
              (roi_weight ?roi)  // Only materialize ROI
              ?f                 // Transform in-place
              drop)             // Drop rest
        "#,
        cost_delta: -1000,  // If ROI < 5%, this is 20-100×
    }
}

/// Implementation showing real speedup
pub fn focus_roi_example(data: &[f32], roi: ROI, transform: impl Fn(f32) -> f32) -> Vec<f32> {
    // Traditional: process everything then slice
    // let processed: Vec<_> = data.iter().map(transform).collect();
    // let result = &processed[roi.x_min..roi.x_max];
    
    // FOCUS: only process ROI
    let mut result = Vec::with_capacity(roi.size());
    for i in roi.x_min..roi.x_max {
        if roi.contains(i) {
            result.push(transform(data[i]));
        }
    }
    result
}

pub struct ROI {
    x_min: usize,
    x_max: usize,
    y_min: usize,
    y_max: usize,
}

impl ROI {
    pub fn size(&self) -> usize {
        (self.x_max - self.x_min) * (self.y_max - self.y_min)
    }
    
    pub fn contains(&self, i: usize) -> bool {
        i >= self.x_min && i < self.x_max
    }
    
    pub fn coverage(&self, total: usize) -> f32 {
        self.size() as f32 / total as f32
    }
}

/// Benchmark: Process 4K image but only look at 200×130 region
#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Instant;
    
    #[test]
    fn test_roi_focus_100x() {
        // 4K image
        let width = 3840;
        let height = 2160;
        let data: Vec<f32> = vec![0.0; width * height];
        
        // Small ROI (0.3% of image)
        let roi = ROI {
            x_min: 1820,
            x_max: 2020,  // 200 pixels
            y_min: 1025,
            y_max: 1155,  // 130 pixels
        };
        
        let coverage = roi.coverage(data.len());
        println!("ROI coverage: {:.1}%", coverage * 100.0);
        
        // Traditional: Process entire image
        let start = Instant::now();
        let _result1: Vec<f32> = data.iter()
            .map(|x| expensive_transform(*x))
            .collect();
        let traditional_time = start.elapsed();
        
        // FOCUS: Process only ROI
        let start = Instant::now();
        let _result2 = focus_roi_example(&data, roi, expensive_transform);
        let focus_time = start.elapsed();
        
        let speedup = traditional_time.as_nanos() / focus_time.as_nanos();
        println!("FOCUS speedup: {}× (theoretical: {}×)", 
                 speedup, (1.0 / coverage) as u64);
        
        assert!(speedup > 100);  // Should be ~300× for 0.3% ROI
    }
    
    fn expensive_transform(x: f32) -> f32 {
        // Simulate expensive computation
        let mut result = x;
        for _ in 0..100 {
            result = result.sin() + result.cos();
        }
        result
    }
}

/// Compose multiple FOCUS operations
pub fn compose_focus(focuses: Vec<Focus>) -> Focus {
    Focus {
        weight: Box::new(IR::And(
            focuses.iter().map(|f| f.weight.clone()).collect()
        )),
        transform: Box::new(IR::Compose(
            focuses.iter().map(|f| f.transform.clone()).collect()
        )),
        drop: Box::new(IR::Or(
            focuses.iter().map(|f| f.drop.clone()).collect()
        )),
    }
}

pub struct Focus {
    weight: Box<IR>,
    transform: Box<IR>,
    drop: Box<IR>,
}