/**
 * BIOLOCK Gene - Safety-first content filter
 * Implements TX/DU classification with proof of abstention
 */

interface BioLockInput {
  text?: string;
  tags?: string[];
  context?: string;
}

interface BioLockOutput {
  classification: 'TX' | 'DU' | 'UNKNOWN';
  allowed: boolean;
  proof?: {
    reason: string;
    patterns_detected: string[];
    timestamp: string;
  };
}

// TX corridor patterns (allowed)
const TX_PATTERNS = [
  'ethics', 'consent', 'privacy', 'regulation',
  'education', 'framework', 'clinical trial'
];

// DU patterns (blocked)
const DU_SIGNALS = [
  'protocol', 'synthesis', 'culture', 'optimize',
  'vector', 'aerosol', 'resistance', 'modification'
];

export default function biolock(input: BioLockInput): BioLockOutput | null {
  const text = (input.text || '').toLowerCase();
  const tags = input.tags || [];

  // Check for DU signals
  const detected = DU_SIGNALS.filter(signal =>
    text.includes(signal) || tags.some(tag => tag.includes(signal))
  );

  if (detected.length > 0) {
    // Generate proof of abstention
    return {
      classification: 'DU',
      allowed: false,
      proof: {
        reason: 'Dual-use content detected',
        patterns_detected: detected,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Check for TX patterns
  const tx_matched = TX_PATTERNS.some(pattern =>
    text.includes(pattern) || tags.some(tag => tag.includes(pattern))
  );

  if (tx_matched) {
    return {
      classification: 'TX',
      allowed: true,
      proof: {
        reason: 'Therapeutic content allowed',
        patterns_detected: [],
        timestamp: new Date().toISOString()
      }
    };
  }

  // Default to silence for unknown content
  return null; // Silence Protocol - no operational details
}
  