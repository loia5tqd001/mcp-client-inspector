import React, { useState } from 'react';

interface CopiableAreaProps {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

const copyIcon = (
  <svg
    width='18'
    height='18'
    viewBox='0 0 20 20'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <rect
      x='7'
      y='7'
      width='9'
      height='9'
      rx='2'
      stroke='currentColor'
      strokeWidth='1.5'
    />
    <rect
      x='4'
      y='4'
      width='9'
      height='9'
      rx='2'
      stroke='currentColor'
      strokeWidth='1.5'
    />
  </svg>
);

const CopiableArea: React.FC<CopiableAreaProps> = ({
  children,
  className = '',
  ariaLabel,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    let text = '';
    if (typeof children === 'string') {
      text = children;
    } else if (Array.isArray(children)) {
      text = children.map((c) => (typeof c === 'string' ? c : ''))?.join('');
    } else if (React.isValidElement(children)) {
      // @ts-expect-error extracting text from React element children, may not be string
      text = children.props?.children || '';
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // fallback: do nothing
    }
  };

  return (
    <div
      className={`copiable-area-root ${className}`}
      style={{ position: 'relative' }}
    >
      <pre
        className='copiable-area-pre'
        aria-label={ariaLabel}
        tabIndex={0}
        style={{ margin: 0 }}
      >
        {children}
      </pre>
      <button
        className='copiable-area-copy-btn'
        aria-label='Copy to clipboard'
        onClick={handleCopy}
        tabIndex={0}
        type='button'
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 2,
          color: copied ? '#4caf50' : '#aaa',
          transition: 'color 0.2s',
        }}
      >
        {copyIcon}
        <span
          style={{
            position: 'absolute',
            top: '2em',
            right: 0,
            fontSize: 12,
            color: '#4caf50',
            opacity: copied ? 1 : 0,
            transition: 'opacity 0.2s',
            pointerEvents: 'none',
          }}
        >
          Copied!
        </span>
      </button>
    </div>
  );
};

export default CopiableArea;
