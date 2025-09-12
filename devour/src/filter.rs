//! SPDX License Filtering for Devour
//! Only consume genes with compatible licenses

use std::collections::HashSet;

/// SPDX license compatibility matrix
pub struct LicenseFilter {
    allowed: HashSet<String>,
    blocked: HashSet<String>,
}

impl LicenseFilter {
    pub fn new() -> Self {
        let mut allowed = HashSet::new();
        // Permissive licenses
        allowed.insert("MIT".to_string());
        allowed.insert("Apache-2.0".to_string());
        allowed.insert("BSD-3-Clause".to_string());
        allowed.insert("BSD-2-Clause".to_string());
        allowed.insert("ISC".to_string());
        allowed.insert("CC0-1.0".to_string());
        allowed.insert("Unlicense".to_string());
        
        let mut blocked = HashSet::new();
        // Copyleft that could infect
        blocked.insert("GPL-3.0".to_string());
        blocked.insert("AGPL-3.0".to_string());
        blocked.insert("GPL-2.0".to_string());
        
        Self { allowed, blocked }
    }
    
    pub fn is_compatible(&self, license: &str) -> bool {
        if self.blocked.contains(license) {
            return false;
        }
        self.allowed.contains(license)
    }
    
    pub fn check_dependencies(&self, deps: &[(String, String)]) -> Result<(), String> {
        for (name, license) in deps {
            if !self.is_compatible(license) {
                return Err(format!(
                    "Incompatible license {} in dependency {}",
                    license, name
                ));
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_permissive_allowed() {
        let filter = LicenseFilter::new();
        assert!(filter.is_compatible("MIT"));
        assert!(filter.is_compatible("Apache-2.0"));
        assert!(filter.is_compatible("BSD-3-Clause"));
    }
    
    #[test]
    fn test_copyleft_blocked() {
        let filter = LicenseFilter::new();
        assert!(!filter.is_compatible("GPL-3.0"));
        assert!(!filter.is_compatible("AGPL-3.0"));
    }
    
    #[test]
    fn test_dependency_check() {
        let filter = LicenseFilter::new();
        let deps = vec![
            ("foo".to_string(), "MIT".to_string()),
            ("bar".to_string(), "Apache-2.0".to_string()),
        ];
        assert!(filter.check_dependencies(&deps).is_ok());
        
        let bad_deps = vec![
            ("baz".to_string(), "GPL-3.0".to_string()),
        ];
        assert!(filter.check_dependencies(&bad_deps).is_err());
    }
}