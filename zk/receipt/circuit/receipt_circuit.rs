use ark_ff::Field;
use ark_r1cs_std::prelude::*;
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystemRef, SynthesisError};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReceiptCircuit<F: Field> {
    pub action_hash: F,
    pub origin_did: F,
    pub timestamp: F,
    pub nonce: F,
    witness: Option<ReceiptWitness<F>>,
}

#[derive(Clone, Debug)]
struct ReceiptWitness<F: Field> {
    secret_key: F,
    action_data: Vec<F>,
}

impl<F: Field> ConstraintSynthesizer<F> for ReceiptCircuit<F> {
    fn generate_constraints(self, cs: ConstraintSystemRef<F>) -> Result<(), SynthesisError> {
        // Allocate public inputs
        let action_hash_var = FpVar::new_input(cs.clone(), || Ok(self.action_hash))?;
        let origin_did_var = FpVar::new_input(cs.clone(), || Ok(self.origin_did))?;
        let timestamp_var = FpVar::new_input(cs.clone(), || Ok(self.timestamp))?;
        let nonce_var = FpVar::new_input(cs.clone(), || Ok(self.nonce))?;

        // Allocate witness (private inputs)
        if let Some(witness) = self.witness {
            let secret_key_var = FpVar::new_witness(cs.clone(), || Ok(witness.secret_key))?;
            
            // Verify origin DID matches secret key derivation
            let derived_did = secret_key_var.clone() * secret_key_var.clone();
            derived_did.enforce_equal(&origin_did_var)?;
            
            // Verify action hash
            let mut computed_hash = secret_key_var.clone();
            for data in witness.action_data {
                let data_var = FpVar::new_witness(cs.clone(), || Ok(data))?;
                computed_hash = computed_hash + data_var;
            }
            computed_hash = computed_hash + timestamp_var + nonce_var;
            computed_hash.enforce_equal(&action_hash_var)?;
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ark_bls12_381::Fr;
    use ark_relations::r1cs::ConstraintSystem;

    #[test]
    fn test_receipt_circuit() {
        let cs = ConstraintSystem::<Fr>::new_ref();
        
        let circuit = ReceiptCircuit {
            action_hash: Fr::from(12345u64),
            origin_did: Fr::from(100u64),
            timestamp: Fr::from(1234567890u64),
            nonce: Fr::from(999u64),
            witness: Some(ReceiptWitness {
                secret_key: Fr::from(10u64),
                action_data: vec![Fr::from(1u64), Fr::from(2u64)],
            }),
        };
        
        circuit.generate_constraints(cs.clone()).unwrap();
        assert!(cs.is_satisfied().unwrap());
    }
}