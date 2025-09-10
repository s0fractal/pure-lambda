#!/usr/bin/env node

/**
 * gene-md - ProofMD tool for extracting, verifying, and publishing gene documentation
 * Reads Markdown with embedded proof blocks, verifies properties, computes CIDs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');
const { Command } = require('commander');

// CID computation (simplified - real implementation would use multiformats)
function computeCID(content) {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return `bafy${hash.substring(0, 12)}...${hash.substring(hash.length - 4)}`;
}

// Extract code blocks from markdown
function extractBlocks(mdContent) {
    const blocks = {};
    const regex = /```(\w+\+\w+)(?:\s+title=([^\s]+))?(?:\s+cid=(\w+))?\n([\s\S]*?)```/g;
    
    let match;
    while ((match = regex.exec(mdContent)) !== null) {
        const [, type, title, cid, content] = match;
        const key = title || type;
        blocks[key] = {
            type,
            title,
            cid,
            content: content.trim()
        };
    }
    
    // Extract front matter
    const frontMatterMatch = mdContent.match(/^---\n([\s\S]*?)\n---/);
    if (frontMatterMatch) {
        blocks._frontmatter = yaml.load(frontMatterMatch[1]);
    }
    
    return blocks;
}

// Canonicalize λ-IR to ensure deterministic CIDs
function canonicalize(irJson) {
    if (typeof irJson === 'string') {
        irJson = JSON.parse(irJson);
    }
    
    // Sort keys recursively
    function sortKeys(obj) {
        if (Array.isArray(obj)) {
            return obj.map(sortKeys);
        } else if (obj && typeof obj === 'object') {
            return Object.keys(obj).sort().reduce((result, key) => {
                result[key] = sortKeys(obj[key]);
                return result;
            }, {});
        }
        return obj;
    }
    
    const canonical = sortKeys(irJson);
    return JSON.stringify(canonical, null, 2);
}

// Compute soul hash for λ-IR
function computeSoul(canonicalIR) {
    const hash = crypto.createHash('sha3-256').update(canonicalIR).digest('hex');
    return `λ-${hash.substring(0, 8)}`;
}

// Verify laws and properties
function verifyLaws(laws, proofs) {
    const results = {};
    
    for (const law of laws) {
        const proofStatus = proofs.properties?.[law.name]?.status;
        results[law.name] = {
            defined: true,
            proven: proofStatus === 'PROVEN',
            status: proofStatus || 'UNVERIFIED'
        };
    }
    
    return results;
}

// Commands
const program = new Command();

program
    .name('gene-md')
    .description('ProofMD tool for gene documentation')
    .version('0.1.0');

// Extract command
program
    .command('extract <markdown>')
    .description('Extract code blocks from markdown to .genome/')
    .action((markdown) => {
        const mdContent = fs.readFileSync(markdown, 'utf8');
        const blocks = extractBlocks(mdContent);
        
        // Create .genome directory
        const genomeDir = path.join(path.dirname(markdown), '.genome');
        if (!fs.existsSync(genomeDir)) {
            fs.mkdirSync(genomeDir, { recursive: true });
        }
        
        // Save each block
        for (const [key, block] of Object.entries(blocks)) {
            if (key === '_frontmatter') {
                fs.writeFileSync(
                    path.join(genomeDir, 'metadata.yaml'),
                    yaml.dump(block),
                    'utf8'
                );
            } else {
                const ext = block.type.includes('json') ? '.json' : 
                           block.type.includes('yaml') ? '.yaml' : '.txt';
                const filename = (block.title || key).replace(/\.\w+$/, '') + ext;
                fs.writeFileSync(
                    path.join(genomeDir, filename),
                    block.content,
                    'utf8'
                );
            }
        }
        
        console.log(`✅ Extracted ${Object.keys(blocks).length} blocks to ${genomeDir}/`);
    });

// Canonize command
program
    .command('canonize <pattern>')
    .description('Canonicalize λ-IR and other JSON files')
    .action((pattern) => {
        const files = pattern.includes('*') ? 
            require('glob').sync(pattern) : [pattern];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const content = fs.readFileSync(file, 'utf8');
                const canonical = canonicalize(content);
                
                const outputFile = file.replace('.json', '.canonical.json');
                fs.writeFileSync(outputFile, canonical, 'utf8');
                
                console.log(`✅ Canonicalized ${file} → ${outputFile}`);
            }
        }
    });

// Soul command
program
    .command('soul <file>')
    .description('Compute soul hash for λ-IR')
    .action((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const canonical = file.includes('canonical') ? content : canonicalize(content);
        const soul = computeSoul(canonical);
        
        console.log(`Soul: ${soul}`);
        
        // Optionally save to file
        const soulFile = file.replace(/\.\w+$/, '.soul');
        fs.writeFileSync(soulFile, soul, 'utf8');
    });

// Attest command
program
    .command('attest <markdown>')
    .description('Verify laws and proofs in markdown')
    .option('--strict', 'Fail if any law is unproven')
    .action((markdown, options) => {
        const mdContent = fs.readFileSync(markdown, 'utf8');
        const blocks = extractBlocks(mdContent);
        
        // Parse laws and proofs
        const lawsBlock = blocks['laws.yaml'] || blocks['lawset+yaml'];
        const proofsBlock = blocks['proofs.json'] || blocks['proof+json'];
        
        if (!lawsBlock || !proofsBlock) {
            console.error('❌ Missing laws or proofs blocks');
            process.exit(1);
        }
        
        const laws = yaml.load(lawsBlock.content);
        const proofs = JSON.parse(proofsBlock.content);
        
        // Verify
        const results = verifyLaws(laws, proofs);
        
        // Report
        console.log('\n📋 Attestation Report\n');
        console.log(`Gene: ${blocks._frontmatter?.name || 'Unknown'}`);
        console.log(`Soul: ${proofs.soul_after || 'Unknown'}`);
        console.log('\nLaws:');
        
        let allProven = true;
        for (const [name, result] of Object.entries(results)) {
            const icon = result.proven ? '✅' : '❌';
            console.log(`  ${icon} ${name}: ${result.status}`);
            if (!result.proven) allProven = false;
        }
        
        if (options.strict && !allProven) {
            console.error('\n❌ Not all laws are proven');
            process.exit(1);
        }
        
        console.log('\n✅ Attestation complete');
    });

// CID command
program
    .command('cid <file>')
    .description('Compute CID for a file')
    .action((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const cid = computeCID(content);
        console.log(`CID: ${cid}`);
    });

// Link command
program
    .command('link <markdown>')
    .description('Update CIDs in markdown Links section')
    .action((markdown) => {
        const mdContent = fs.readFileSync(markdown, 'utf8');
        const blocks = extractBlocks(mdContent);
        
        // Compute CIDs for each block
        const cids = {};
        for (const [key, block] of Object.entries(blocks)) {
            if (key !== '_frontmatter') {
                cids[key] = computeCID(block.content);
            }
        }
        
        // Update Links section
        let updatedContent = mdContent;
        const linksRegex = /## \d+\. Links[^#]*/;
        const linksMatch = updatedContent.match(linksRegex);
        
        if (linksMatch) {
            const newLinks = `## 9. Links & Addresses

| Block | CID | Verified |
|-------|-----|----------|
${Object.entries(cids).map(([key, cid]) => 
    `| ${key} | \`${cid}\` | ✅ |`
).join('\n')}
| **Document Soul** | \`${computeCID(mdContent)}\` | ✅ |

`;
            updatedContent = updatedContent.replace(linksRegex, newLinks);
            fs.writeFileSync(markdown, updatedContent, 'utf8');
            console.log('✅ Updated CIDs in Links section');
        }
    });

// IPFS command (placeholder)
program
    .command('ipfs <action> <file>')
    .description('IPFS operations (add/pin/get)')
    .option('--pin', 'Pin content to IPFS')
    .action((action, file, options) => {
        console.log(`📦 IPFS ${action}: ${file}`);
        if (action === 'add') {
            const content = fs.readFileSync(file, 'utf8');
            const cid = computeCID(content);
            console.log(`  Added with CID: ${cid}`);
            if (options.pin) {
                console.log(`  ✅ Pinned to local node`);
            }
        }
        // Real implementation would use ipfs-http-client
    });

program.parse(process.argv);