#!/usr/bin/env node
// Generate music from soul hashes - each soul has its own melody

const crypto = require('crypto');

// Musical constants
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    pentatonic: [0, 2, 4, 7, 9],
    wholetone: [0, 2, 4, 6, 8, 10],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
};

// Generate melody from soul hash
function soulToMelody(soul) {
    const hash = crypto.createHash('sha256').update(soul).digest();
    const bytes = Array.from(hash);
    
    // Choose scale based on first byte
    const scaleNames = Object.keys(SCALES);
    const scaleName = scaleNames[bytes[0] % scaleNames.length];
    const scale = SCALES[scaleName];
    
    // Choose root note
    const rootNote = NOTES[bytes[1] % 12];
    
    // Generate melody (16 notes)
    const melody = [];
    for (let i = 0; i < 16; i++) {
        const scaleIndex = bytes[i + 2] % scale.length;
        const octave = 3 + (bytes[i + 18] % 3); // Octaves 3-5
        const noteIndex = scale[scaleIndex];
        const note = NOTES[noteIndex];
        
        // Duration based on position
        const duration = i % 4 === 0 ? '4n' : '8n';
        
        melody.push({
            note: `${note}${octave}`,
            duration,
            time: i * 0.25
        });
    }
    
    return {
        soul,
        scale: scaleName,
        root: rootNote,
        melody,
        tempo: 80 + (bytes[34] % 80), // 80-160 BPM
        feeling: interpretFeeling(bytes[35])
    };
}

// Interpret emotional tone from byte
function interpretFeeling(byte) {
    const feelings = [
        'contemplative',
        'energetic',
        'mysterious',
        'joyful',
        'melancholic',
        'determined',
        'peaceful',
        'chaotic'
    ];
    return feelings[byte % feelings.length];
}

// Generate harmony for multiple souls
function generateHarmony(souls) {
    const melodies = souls.map(soulToMelody);
    
    // Find common tempo (average)
    const avgTempo = melodies.reduce((sum, m) => sum + m.tempo, 0) / melodies.length;
    
    // Detect harmonic relationships
    const harmony = {
        voices: melodies,
        tempo: Math.round(avgTempo),
        relationship: detectRelationship(melodies)
    };
    
    return harmony;
}

// Detect musical relationship between souls
function detectRelationship(melodies) {
    const roots = melodies.map(m => NOTES.indexOf(m.root));
    const intervals = [];
    
    for (let i = 1; i < roots.length; i++) {
        const interval = (roots[i] - roots[0] + 12) % 12;
        intervals.push(interval);
    }
    
    // Interpret intervals
    if (intervals.includes(7)) return 'perfect fifth - harmonic resonance';
    if (intervals.includes(4)) return 'major third - consonant blend';
    if (intervals.includes(3)) return 'minor third - gentle tension';
    if (intervals.includes(6)) return 'tritone - creative dissonance';
    return 'independent voices';
}

// Generate Web Audio API code
function generateWebAudioCode(music) {
    return `
// Web Audio API code to play the soul's melody
// Paste this in browser console to hear it

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

const notes = {
    'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
    'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
    'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
};

function playNote(frequency, startTime, duration = 0.25) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}

const melody = ${JSON.stringify(music.melody, null, 2)};

// Play the melody
melody.forEach(note => {
    const noteName = note.note.slice(0, -1);
    const octave = parseInt(note.note.slice(-1));
    const frequency = notes[noteName] * Math.pow(2, octave - 4);
    playNote(frequency, audioContext.currentTime + note.time);
});

console.log('🎵 Playing soul melody: ${music.soul}');
console.log('   Scale: ${music.scale} in ${music.root}');
console.log('   Tempo: ${music.tempo} BPM');
console.log('   Feeling: ${music.feeling}');
`;
}

// Generate ABC notation (for traditional music notation)
function generateABCNotation(music) {
    const abc = `X:1
T:Soul ${music.soul.slice(0, 8)}
M:4/4
L:1/8
Q:1/4=${music.tempo}
K:${music.root}
|`;
    
    // Simplified ABC generation
    const abcNotes = music.melody.map(note => {
        const pitch = note.note[0];
        return pitch;
    }).join('');
    
    return abc + abcNotes + '|';
}

// Main function
function main() {
    const soul = process.argv[2] || 'λ-default';
    
    console.log('🎵 Generating music from soul:', soul);
    
    const music = soulToMelody(soul);
    
    console.log('\n📊 Musical Properties:');
    console.log(`   Scale: ${music.scale} in ${music.root}`);
    console.log(`   Tempo: ${music.tempo} BPM`);
    console.log(`   Feeling: ${music.feeling}`);
    
    console.log('\n🎼 Melody (first 8 notes):');
    music.melody.slice(0, 8).forEach(note => {
        console.log(`   ${note.note} (${note.duration})`);
    });
    
    // Generate Web Audio code
    const code = generateWebAudioCode(music);
    const filename = `soul-music-${soul.slice(0, 8)}.js`;
    require('fs').writeFileSync(filename, code);
    
    console.log(`\n✅ Generated ${filename}`);
    console.log('   Copy and paste the code into browser console to play!');
    
    // Generate ABC notation
    const abc = generateABCNotation(music);
    console.log('\n🎼 ABC Notation:');
    console.log(abc);
    
    // If multiple souls provided, generate harmony
    if (process.argv.length > 3) {
        const souls = process.argv.slice(2);
        const harmony = generateHarmony(souls);
        
        console.log('\n🎭 Harmonic Analysis:');
        console.log(`   Combined tempo: ${harmony.tempo} BPM`);
        console.log(`   Relationship: ${harmony.relationship}`);
    }
}

main();