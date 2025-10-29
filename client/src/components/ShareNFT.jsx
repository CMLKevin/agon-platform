import { useState } from 'react';
import { useToast } from './Toast';

const ShareNFT = ({ nftId, nftName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { success } = useToast();

  const nftUrl = `${window.location.origin}/nft/${nftId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(nftUrl);
      success('Link copied to clipboard!');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareOptions = [
    {
      name: 'Twitter',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
        </svg>
      ),
      action: () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out "${nftName}" on Agon NFT Marketplace!`)}&url=${encodeURIComponent(nftUrl)}`, '_blank');
        setIsOpen(false);
      }
    },
    {
      name: 'Discord',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      ),
      action: () => {
        // Discord doesn't have a direct share URL, so we copy the message
        const message = `Check out "${nftName}" on Agon NFT Marketplace! ${nftUrl}`;
        navigator.clipboard.writeText(message);
        success('Message copied! Paste it in Discord.');
        setIsOpen(false);
      }
    }
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-phantom-bg-tertiary rounded-lg transition-colors"
        title="Share NFT"
      >
        <svg className="w-5 h-5 text-phantom-text-secondary hover:text-phantom-text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-phantom-bg-secondary border-2 border-phantom-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-phantom-border">
              <p className="text-sm font-medium text-phantom-text-primary">Share NFT</p>
            </div>

            {/* Copy link */}
            <button
              onClick={copyToClipboard}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-phantom-bg-tertiary transition-colors text-left"
            >
              <div className="p-2 bg-phantom-accent-primary/20 rounded-lg text-phantom-accent-primary">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-phantom-text-primary">Copy Link</p>
                <p className="text-xs text-phantom-text-tertiary">Copy URL to clipboard</p>
              </div>
            </button>

            {/* Social share options */}
            {shareOptions.map((option, index) => (
              <button
                key={index}
                onClick={option.action}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-phantom-bg-tertiary transition-colors text-left"
              >
                <div className="p-2 bg-phantom-accent-primary/20 rounded-lg text-phantom-accent-primary">
                  {option.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-phantom-text-primary">Share to {option.name}</p>
                  <p className="text-xs text-phantom-text-tertiary">Post on {option.name}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ShareNFT;
