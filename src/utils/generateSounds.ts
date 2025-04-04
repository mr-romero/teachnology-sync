export const generateSuccessSound = async () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // Start at A5
  oscillator.frequency.exponentialRampToValueAtTime(1760, audioContext.currentTime + 0.1); // Go up to A6

  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.3);

  return new Promise(resolve => setTimeout(resolve, 300));
};

export const generateChimeSound = async () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(1318.51, audioContext.currentTime); // E6
  oscillator.frequency.setValueAtTime(1567.98, audioContext.currentTime + 0.1); // G6
  oscillator.frequency.setValueAtTime(2093.00, audioContext.currentTime + 0.2); // C7

  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.4);

  return new Promise(resolve => setTimeout(resolve, 400));
};

export const generateApplauseSound = async () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const bufferSize = 4096;
  const whiteNoise = audioContext.createScriptProcessor(bufferSize, 1, 1);
  const gainNode = audioContext.createGain();
  
  whiteNoise.connect(gainNode);
  gainNode.connect(audioContext.destination);

  whiteNoise.onaudioprocess = (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  };

  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + 0.2);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);

  setTimeout(() => {
    whiteNoise.disconnect();
  }, 300);

  return new Promise(resolve => setTimeout(resolve, 300));
};

// Function to generate and save sound effects
export async function generateCelebrationSounds() {
  const audioContext = new AudioContext();

  // Generate success sound
  const successSound = generateSuccessSound(audioContext);
  await saveSound(successSound, 'success');

  // Generate chime sound
  const chimeSound = generateChimeSound(audioContext);
  await saveSound(chimeSound, 'chime');

  // Generate applause sound
  const applauseSound = generateApplauseSound(audioContext);
  await saveSound(applauseSound, 'applause');
}

// Helper function to generate a bright success sound
function generateSuccessSound(ctx: AudioContext): AudioBuffer {
  const duration = 0.6;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const channelData = buffer.getChannelData(0);
  
  // Create a bright, ascending tone
  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate;
    const frequency = 440 + Math.sin(t * 15) * 220;
    channelData[i] = Math.sin(frequency * t * Math.PI * 2) * 
      Math.exp(-3 * t) * // Envelope
      0.5; // Volume
  }
  
  return buffer;
}

// Helper function to generate a gentle chime sound
function generateChimeSound(ctx: AudioContext): AudioBuffer {
  const duration = 1.0;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const channelData = buffer.getChannelData(0);
  
  // Create a bell-like tone with harmonics
  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate;
    const fundamental = 880;
    channelData[i] = (
      Math.sin(fundamental * t * Math.PI * 2) * 0.5 +
      Math.sin(fundamental * 2 * t * Math.PI * 2) * 0.25 +
      Math.sin(fundamental * 3 * t * Math.PI * 2) * 0.125
    ) * Math.exp(-4 * t); // Envelope
  }
  
  return buffer;
}

// Helper function to generate a crowd applause sound
function generateApplauseSound(ctx: AudioContext): AudioBuffer {
  const duration = 1.5;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const channelData = buffer.getChannelData(0);
  
  // Create noise-based applause sound
  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate;
    const noise = Math.random() * 2 - 1;
    
    // Shape the noise with an envelope
    const envelope = Math.min(t * 4, 1) * Math.exp(-2 * t);
    
    // Add some filtering effect
    channelData[i] = noise * envelope * 0.5;
  }
  
  return buffer;
}

// Helper function to save an AudioBuffer as an audio file
async function saveSound(buffer: AudioBuffer, name: string) {
  // Convert AudioBuffer to WAV format
  const wav = audioBufferToWav(buffer);
  
  // Convert to blob and save
  const blob = new Blob([wav], { type: 'audio/wav' });
  
  // Use Response and streams to write to disk
  const response = new Response(blob);
  const arrayBuffer = await response.arrayBuffer();
  
  // Return the buffer - in a real app you'd save this to disk or upload to storage
  return arrayBuffer;
}

// Helper function to convert AudioBuffer to WAV format
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const dataSize = buffer.length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  
  const arrayBuffer = new ArrayBuffer(totalSize);
  const dataView = new DataView(arrayBuffer);
  
  // Write WAV header
  writeString(dataView, 0, 'RIFF');
  dataView.setUint32(4, totalSize - 8, true);
  writeString(dataView, 8, 'WAVE');
  writeString(dataView, 12, 'fmt ');
  dataView.setUint32(16, 16, true); // Size of fmt chunk
  dataView.setUint16(20, format, true);
  dataView.setUint16(22, numChannels, true);
  dataView.setUint32(24, sampleRate, true);
  dataView.setUint32(28, sampleRate * blockAlign, true); // Byte rate
  dataView.setUint16(32, blockAlign, true);
  dataView.setUint16(34, bitDepth, true);
  writeString(dataView, 36, 'data');
  dataView.setUint32(40, dataSize, true);
  
  // Write audio data
  const offset = 44;
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < buffer.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    dataView.setInt16(offset + i * 2, value, true);
  }
  
  return arrayBuffer;
}

// Helper function to write a string to a DataView
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}