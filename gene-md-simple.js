#!/usr/bin/env node

/**
 * gene-md-simple - Simplified ProofMD tool without external dependencies
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Simple YAML parser for our use case
function parseSimpleYAML(content) {
    const lines = content.split('\n');
    const result = [];
    let current = null;
    
    for (const line of lines) {
        if (line.startsWith('- name:')) {
            if (current) result.push(current);
            current = { name: line.replace('- name:', '').trim() };
        } else if (current && line.startsWith('  ')) {
            const [key, ...valueParts] = line.trim().split(':');
            if (key) {
                current[key] = valueParts.join(':').trim();
            }
        }
    }
    if (current) result.push(current);
    return result;
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
    
    return blocks;
}

// Compute CID
function computeCID(content) {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return `bafy${hash.substring(0, 12)}...${hash.substring(hash.length - 4)}`;
}

// Compute soul hash
function computeSoul(content) {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return `λ-${hash.substring(0, 8)}`;
}

// Main CLI
const args = process.argv.slice(2);
const command = args[0];
const file = args[1];

if (!command || !file) {
    console.log('Usage: gene-md-simple <command> <file>');
    console.log('Commands: extract, soul, cid, verify');
    process.exit(1);
}

switch (command) {
    case 'extract': {
        const mdContent = fs.readFileSync(file, 'utf8');
        const blocks = extractBlocks(mdContent);
        
        // Create .genome directory
        const genomeDir = path.join(path.dirname(file), '.genome');
        if (!fs.existsSync(genomeDir)) {
            fs.mkdirSync(genomeDir, { recursive: true });
        }
        
        // Save blocks
        let count = 0;
        for (const [key, block] of Object.entries(blocks)) {
            const ext = block.type.includes('json') ? '.json' : 
                       block.type.includes('yaml') ? '.yaml' : '.txt';
            const filename = (block.title || key).replace(/\.\w+$/, '') + ext;
            const filepath = path.join(genomeDir, filename);
            fs.writeFileSync(filepath, block.content, 'utf8');
            count++;
            console.log(`  Extracted: ${filename}`);
        }
        
        console.log(`✅ Extracted ${count} blocks to ${genomeDir}/`);
        break;
    }
    
    case 'soul': {
        const content = fs.readFileSync(file, 'utf8');
        const soul = computeSoul(content);
        console.log(`Soul: ${soul}`);
        break;
    }
    
    case 'cid': {
        const content = fs.readFileSync(file, 'utf8');
        const cid = computeCID(content);
        console.log(`CID: ${cid}`);
        break;
    }
    
    case 'verify': {
        const mdContent = fs.readFileSync(file, 'utf8');
        const blocks = extractBlocks(mdContent);
        
        console.log('\n📋 Verification Report\n');
        console.log(`File: ${file}`);
        console.log(`Blocks found: ${Object.keys(blocks).length}`);
        
        // Check for required blocks
        const required = ['focus.canon', 'laws.yaml', 'rewrites.yaml', 'proofs.json'];
        const hasCanon = !!blocks['focus.canon'] || !!blocks['lambda-ir+json'];
        const hasLaws = !!blocks['laws.yaml'] || !!blocks['lawset+yaml'];
        const hasRewrites = !!blocks['rewrites.yaml'] || !!blocks['rules+yaml'];
        const hasProofs = !!blocks['proofs.json'] || !!blocks['proof+json'];
        
        console.log('\nRequired blocks:');
        console.log(`  ${hasCanon ? '✅' : '❌'} Canon (λ-IR)`);
        console.log(`  ${hasLaws ? '✅' : '❌'} Laws`);
        console.log(`  ${hasRewrites ? '✅' : '❌'} Rewrites`);
        console.log(`  ${hasProofs ? '✅' : '❌'} Proofs`);
        
        // Parse and check laws
        if (hasLaws && hasProofs) {
            const lawsBlock = blocks['laws.yaml'] || blocks['lawset+yaml'];
            const proofsBlock = blocks['proofs.json'] || blocks['proof+json'];
            
            const laws = parseSimpleYAML(lawsBlock.content);
            const proofs = JSON.parse(proofsBlock.content);
            
            console.log('\nLaw verification:');
            for (const law of laws) {
                const status = proofs.properties?.[law.name]?.status;
                const icon = status === 'PROVEN' ? '✅' : '❌';
                console.log(`  ${icon} ${law.name}: ${status || 'UNVERIFIED'}`);
            }
        }
        
        // Compute document soul
        const docSoul = computeSoul(mdContent);
        console.log(`\nDocument Soul: ${docSoul}`);
        
        console.log('\n✅ Verification complete');
        break;
    }
    
    default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
}