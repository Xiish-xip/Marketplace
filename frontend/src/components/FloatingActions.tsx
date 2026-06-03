import React, { useState } from 'react';
import { Bot, Settings, MessageCircle, ChevronUp, X } from 'lucide-react';

export default function FloatingActions() {
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen((v) => !v);
  const close = () => setOpen(false);

  const dispatch = (name: string) => {
    window.dispatchEvent(new Event(name));
    // close after action
    close();
  };

  const actions = [
    { icon: <Bot className="w-4 h-4" />, title: 'Chat', event: 'floating:toggle-chat' },
    { icon: <MessageCircle className="w-4 h-4" />, title: 'Live support', event: 'floating:toggle-live' },
    { icon: <Settings className="w-4 h-4" />, title: 'Accessibility', event: 'floating:toggle-accessibility' },
    { icon: <ChevronUp className="w-4 h-4" />, title: 'Back to top', event: 'floating:back-to-top' },
  ];

  return (
    <div aria-hidden="false">
      <div className="fixed bottom-6 right-6 z-[9999]">
        <div className="relative w-12 h-12">
          {/* action buttons positioned around */}
          {actions.map((a, i) => {
            const quadrantAngles = [Math.PI, (7 * Math.PI) / 6, (4 * Math.PI) / 3, (3 * Math.PI) / 2];
            const angle = quadrantAngles[i];
            const distance = open ? 72 : 0;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            return (
              <button
                key={a.title}
                onClick={() => dispatch(a.event)}
                className={`absolute w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-transform duration-500`} 
                style={{
                  transform: `translate(${x}px, ${y}px) scale(${open ? 1 : 0}) rotate(${open ? 720 : 0}deg)`,
                  backgroundColor: 'rgb(var(--color-surface))',
                  color: 'rgb(var(--color-text-secondary))',
                  border: '1px solid rgba(0,0,0,0.06)'
                }}
                title={a.title}
                aria-label={a.title}
              >
                {a.icon}
              </button>
            );
          })}

          {/* center button */}
          <button
            onClick={toggle}
            aria-expanded={open}
            aria-label={open ? 'Close actions' : 'Open actions'}
            className={`absolute inset-0 m-0 w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-transform duration-500`} 
            style={{
              backgroundColor: open ? 'rgb(var(--color-danger))' : 'rgb(var(--color-primary-600))',
              color: 'white',
              transform: `rotate(${open ? 360 : 0}deg)`
            }}
          >
            {open ? <X className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
