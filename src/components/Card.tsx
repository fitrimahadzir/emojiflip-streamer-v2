import { motion } from 'motion/react';
import React from 'react';

interface CardProps {
  key?: React.Key;
  emoji: string;
  number: number;
  isFlipped: boolean;
  isMatched: boolean;
  matchedBy?: 'MEN' | 'WOMEN';
  activeTeam: 'MEN' | 'WOMEN' | null;
  onClick: () => void;
}

export function Card({ emoji, number, isFlipped, isMatched, matchedBy, activeTeam, onClick }: CardProps) {
  return (
    <div 
      className="relative w-full aspect-square cursor-pointer"
      style={{ perspective: 1000 }}
      onClick={onClick}
    >
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped || isMatched ? 180 : 0 }}
        transition={{ duration: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
      >
        {/* Card Back (Face down) */}
        <div 
          className={`absolute inset-0 w-full h-full rounded-xl shadow-sm flex items-center justify-center border-b-[6px] transition-colors duration-500 ${
            activeTeam === 'MEN' ? 'bg-blue-500 border-blue-700' : 
            activeTeam === 'WOMEN' ? 'bg-pink-500 border-pink-700' : 
            'bg-gray-400 border-gray-600'
          }`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <span className="text-white font-extrabold text-3xl sm:text-4xl md:text-5xl select-none tracking-tight">{number}</span>
        </div>

        {/* Card Front (Face up with emoji) */}
        <div 
          className={`absolute inset-0 w-full h-full rounded-xl bg-white shadow-md flex items-center justify-center border-[4px] overflow-hidden transition-colors duration-500 ${
            matchedBy === 'MEN' ? 'border-blue-500' :
            matchedBy === 'WOMEN' ? 'border-pink-500' :
            activeTeam === 'MEN' ? 'border-blue-500' : 
            activeTeam === 'WOMEN' ? 'border-pink-500' : 
            'border-gray-400'
          }`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {emoji.startsWith('http') || emoji.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? (
            <img 
              src={emoji} 
              alt="Card" 
              className="w-full h-full object-cover" 
              style={{ filter: isMatched ? 'grayscale(0%)' : 'grayscale(0)' }} 
              draggable={false}
            />
          ) : (
            <span className="text-6xl sm:text-7xl md:text-[5.5rem] leading-none font-bold select-none text-gray-700 text-center flex items-center justify-center w-full h-full" style={{ filter: isMatched ? 'grayscale(0%)' : 'grayscale(0)' }}>
              {emoji}
            </span>
          )}
          {isMatched && (
            <motion.div 
              className={`absolute inset-0 pointer-events-none ${matchedBy === 'MEN' ? 'bg-blue-500/30' : matchedBy === 'WOMEN' ? 'bg-pink-500/30' : 'bg-green-500/20'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
