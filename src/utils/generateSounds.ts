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