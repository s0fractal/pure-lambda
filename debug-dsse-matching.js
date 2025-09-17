const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Build artifact list from garden seeds
const artifactsByName = new Map();
const gardenDir = './seeds/garden';
const seeds = fs.readdirSync(gardenDir).filter(f => f.endsWith('.json'));

seeds.forEach(seedFile => {
  const seedPath = path.join(gardenDir, seedFile);
  const content = fs.readFileSync(seedPath);
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  artifactsByName.set(seedFile, {
    name: seedFile,
    subjectHash: hash,
    hasValidDSSE: false,
    source: 'garden'
  });

  console.log(`Garden seed: ${seedFile}`);
  console.log(`  Hash: ${hash.substring(0, 16)}...`);
});

// Add release artifacts
const releaseFiles = [
  { path: './dist/release/stage/docs/pocket/index.htmlc', name: 'index.htmlc' },
  { path: './dist/release/embassy.zip', name: 'embassy.zip' }
];

releaseFiles.forEach(file => {
  if (fs.existsSync(file.path)) {
    const content = fs.readFileSync(file.path);
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    artifactsByName.set(file.name, {
      name: file.name,
      subjectHash: hash,
      hasValidDSSE: false,
      source: 'release'
    });

    console.log(`Release artifact: ${file.name}`);
    console.log(`  Hash: ${hash.substring(0, 16)}...`);
  }
});

console.log('\n--- Loading DSSE Envelopes ---');

// Load and match DSSE envelopes
const dsseGarden = './dsse/garden';
const dsseRelease = './dsse/release';

function processEnvelope(envelopePath) {
  const envelope = JSON.parse(fs.readFileSync(envelopePath, 'utf8'));
  const fileName = path.basename(envelopePath);

  console.log(`\nEnvelope: ${fileName}`);

  // Extract subject info
  let subjectName = null;
  let subjectHash = null;

  const payloadData = envelope.payloadBase64 || envelope.payload;
  if (payloadData) {
    try {
      const payload = JSON.parse(Buffer.from(payloadData, 'base64').toString());
      if (payload.subject) {
        subjectName = payload.subject.name;
        subjectHash = payload.subject.blake3;
        console.log(`  Subject name: ${subjectName}`);
        console.log(`  Subject hash: ${subjectHash?.substring(0, 16)}...`);
      } else if (payload.seed) {
        subjectName = payload.name + '.json';
        subjectHash = payload.seed.hash;
        console.log(`  Old format - name: ${subjectName}`);
        console.log(`  Old format - hash: ${subjectHash?.substring(0, 16)}...`);
      }
    } catch (e) {
      console.log(`  Error parsing payload: ${e.message}`);
    }
  }

  // Try to match
  const artifactName = fileName.replace('.envelope.json', '');
  console.log(`  Looking for artifact: ${subjectName || artifactName}`);

  if (artifactsByName.has(subjectName)) {
    console.log(`  ✅ Matched by subject name: ${subjectName}`);
    artifactsByName.get(subjectName).hasValidDSSE = true;
  } else if (artifactsByName.has(artifactName)) {
    console.log(`  ✅ Matched by artifact name: ${artifactName}`);
    artifactsByName.get(artifactName).hasValidDSSE = true;
  } else if (artifactName && artifactName.includes('.')) {
    const seedName = artifactName.split('.')[0] + '.json';
    if (artifactsByName.has(seedName)) {
      console.log(`  ✅ Matched as seed: ${seedName}`);
      artifactsByName.get(seedName).hasValidDSSE = true;
    } else {
      console.log(`  ❌ No match found`);
    }
  } else {
    console.log(`  ❌ No match found`);
  }
}

// Process garden envelopes
if (fs.existsSync(dsseGarden)) {
  fs.readdirSync(dsseGarden)
    .filter(f => f.endsWith('.envelope.json'))
    .forEach(f => processEnvelope(path.join(dsseGarden, f)));
}

// Process release envelopes
if (fs.existsSync(dsseRelease)) {
  fs.readdirSync(dsseRelease)
    .filter(f => f.endsWith('.envelope.json'))
    .forEach(f => processEnvelope(path.join(dsseRelease, f)));
}

// Summary
console.log('\n--- Summary ---');
const artifacts = Array.from(artifactsByName.values());
const withDSSE = artifacts.filter(a => a.hasValidDSSE);
console.log(`Total artifacts: ${artifacts.length}`);
console.log(`With valid DSSE: ${withDSSE.length}`);
console.log(`Ratio: ${withDSSE.length}/${artifacts.length} = ${(withDSSE.length / artifacts.length * 100).toFixed(1)}%`);

console.log('\nMissing DSSE:');
artifacts.filter(a => !a.hasValidDSSE).forEach(a => {
  console.log(`  - ${a.name} (${a.source})`);
});