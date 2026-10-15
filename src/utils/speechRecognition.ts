// Hands-free voice recognition loop using Web Speech Recognition API

export type VoiceCommandHandler = (
  command:
    | 'SCAN'
    | 'CHECK_JOINT'
    | 'BUILD'
    | 'CRAVING'
    | 'LOG_PART'
    | 'MUTE'
    | 'TORCH'
    | 'HEAT'
    | 'DOCTOR'
    | 'AUTO_WATCH',
  rawPhrase: string
) => void;

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

let recognition: SpeechRecognitionInstance | null = null;
let isListening = false;
let shouldKeepListening = false;

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export function startHandsFreeListening(onCommand: VoiceCommandHandler, onStatusChange?: (active: boolean) => void) {
  if (!isSpeechRecognitionSupported()) {
    console.warn('SpeechRecognition is not supported in this browser.');
    return;
  }

  shouldKeepListening = true;

  const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  try {
    if (!recognition) {
      recognition = new SpeechRecognitionConstructor();
      recognition!.continuous = true;
      recognition!.interimResults = false;
      recognition!.lang = 'en-US';

      recognition!.onresult = (event: any) => {
        const lastResultIndex = event.results.length - 1;
        const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
        console.log('[JARVIS MIC]: Heard phrase ->', transcript);

        // Command parsing rules (hands occupied holding soldering iron)
        if (transcript.includes('heat') || transcript.includes('pace joint') || transcript.includes('three second')) {
          onCommand('HEAT', transcript);
        } else if (transcript.includes('auto watch') || transcript.includes('overwatch')) {
          onCommand('AUTO_WATCH', transcript);
        } else if (transcript.includes('doctor') || transcript.includes('triage') || transcript.includes('dead phone')) {
          onCommand('DOCTOR', transcript);
        } else if (transcript.includes('scan') || transcript.includes('harvest') || transcript.includes('motherboard')) {
          onCommand('SCAN', transcript);
        } else if (
          transcript.includes('check joint') ||
          transcript.includes('joint') ||
          transcript.includes('solder') ||
          transcript.includes('inspect')
        ) {
          onCommand('CHECK_JOINT', transcript);
        } else if (
          transcript.includes('what can i build') ||
          transcript.includes('what can we build') ||
          transcript.includes('build') ||
          transcript.includes('schematic') ||
          transcript.includes('project')
        ) {
          onCommand('BUILD', transcript);
        } else if (
          transcript.includes('craving') ||
          transcript.includes('override') ||
          transcript.includes('emergency') ||
          transcript.includes('nicotine') ||
          transcript.includes('urge')
        ) {
          onCommand('CRAVING', transcript);
        } else if (transcript.includes('log part') || transcript.includes('save part') || transcript.includes('harvest part')) {
          onCommand('LOG_PART', transcript);
        } else if (transcript.includes('mute') || transcript.includes('quiet') || transcript.includes('stop voice')) {
          onCommand('MUTE', transcript);
        } else if (transcript.includes('torch') || transcript.includes('light') || transcript.includes('flash')) {
          onCommand('TORCH', transcript);
        }
      };

      recognition!.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('[JARVIS MIC] speech error:', event.error);
        }
      };

      recognition!.onend = () => {
        isListening = false;
        if (onStatusChange) onStatusChange(false);
        if (shouldKeepListening) {
          setTimeout(() => {
            if (shouldKeepListening && !isListening) {
              try {
                recognition?.start();
                isListening = true;
                if (onStatusChange) onStatusChange(true);
              } catch {}
            }
          }, 300);
        }
      };
    }

    if (!isListening && recognition) {
      recognition.start();
      isListening = true;
      if (onStatusChange) onStatusChange(true);
    }
  } catch (err) {
    console.warn('Failed to start speech recognition:', err);
  }
}

export function stopHandsFreeListening(onStatusChange?: (active: boolean) => void) {
  shouldKeepListening = false;
  if (recognition && isListening) {
    try {
      recognition.stop();
    } catch {}
    isListening = false;
    if (onStatusChange) onStatusChange(false);
  }
}
