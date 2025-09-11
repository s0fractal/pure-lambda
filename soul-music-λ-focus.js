
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

const melody = [
  {
    "note": "D4",
    "duration": "4n",
    "time": 0
  },
  {
    "note": "A3",
    "duration": "8n",
    "time": 0.25
  },
  {
    "note": "F5",
    "duration": "8n",
    "time": 0.5
  },
  {
    "note": "D5",
    "duration": "8n",
    "time": 0.75
  },
  {
    "note": "G5",
    "duration": "4n",
    "time": 1
  },
  {
    "note": "B3",
    "duration": "8n",
    "time": 1.25
  },
  {
    "note": "G4",
    "duration": "8n",
    "time": 1.5
  },
  {
    "note": "F5",
    "duration": "8n",
    "time": 1.75
  },
  {
    "note": "F5",
    "duration": "4n",
    "time": 2
  },
  {
    "note": "E4",
    "duration": "8n",
    "time": 2.25
  },
  {
    "note": "A3",
    "duration": "8n",
    "time": 2.5
  },
  {
    "note": "G4",
    "duration": "8n",
    "time": 2.75
  },
  {
    "note": "A4",
    "duration": "4n",
    "time": 3
  },
  {
    "note": "B5",
    "duration": "8n",
    "time": 3.25
  },
  {
    "note": "DNaN",
    "duration": "8n",
    "time": 3.5
  },
  {
    "note": "ANaN",
    "duration": "8n",
    "time": 3.75
  }
];

// Play the melody
melody.forEach(note => {
    const noteName = note.note.slice(0, -1);
    const octave = parseInt(note.note.slice(-1));
    const frequency = notes[noteName] * Math.pow(2, octave - 4);
    playNote(frequency, audioContext.currentTime + note.time);
});

console.log('🎵 Playing soul melody: λ-focus');
console.log('   Scale: major in C#');
console.log('   Tempo: NaN BPM');
console.log('   Feeling: undefined');
