import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { RotateCcw, AlertTriangle, Trophy, ChevronDown, Radio, Eye, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { Card } from './components/Card';

const EMOJI_THEMES: Record<string, string[]> = {
  'Fruits': ['🍎', '🍌', '🍉', '🍇', '🍓', '🥑'],
  'Faces': ['😀', '😂', '😎', '😍', '😡', '😭'],
  'Vehicles': ['🚗', '🚕', '🚓', '🚑', '🚒', '🚜'],
  'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊'],
  'Host': ['🎤', '🎤', '🎤', '🎤', '🎤', '🎤'], // Replace with text or image path like '/image1.png'
};

const THEME_NAMES = Object.keys(EMOJI_THEMES);

const ENABLE_DEV_MODE = true;

const TEST_USERS = [
  ...Array.from({ length: 20 }, (_, i) => `testuser_tuan_${i + 1}`),
  ...Array.from({ length: 20 }, (_, i) => `testuser_puan_${i + 1}`)
];

interface GameCard {
  id: string;
  emoji: string;
}

export default function App() {
  const [currentTheme, setCurrentTheme] = useState<string>('Faces');
  const [cards, setCards] = useState<GameCard[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedIndices, setMatchedIndices] = useState<number[]>([]);
  const [matchedBy, setMatchedBy] = useState<Record<number, 'MEN' | 'WOMEN'>>({});
  const [mistakes, setMistakes] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const [isDevMode, setIsDevMode] = useState(ENABLE_DEV_MODE);

  useEffect(() => {
    if (isDevMode) {
      const men = TEST_USERS.filter(u => u.includes('_tuan_'));
      const women = TEST_USERS.filter(u => u.includes('_puan_'));
      setParticipantsMen(prev => Array.from(new Set([...prev, ...men])));
      setParticipantsWomen(prev => Array.from(new Set([...prev, ...women])));
      
      const newPics: Record<string, string> = {};
      TEST_USERS.forEach(u => {
        newPics[u] = `https://api.dicebear.com/7.x/avataaars/svg?seed=${u}`;
      });
      setProfilePictures(prev => ({ ...prev, ...newPics }));
    }
  }, [isDevMode]);

  const [cardCount, setCardCount] = useState<number>(12);
  const [showWelcomePage, setShowWelcomePage] = useState(true);
  
  // TikTok Live states
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [tiktokError, setTiktokError] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [simComment, setSimComment] = useState('');
  const [simUser, setSimUser] = useState(TEST_USERS[0]);

  // Participant states
  const [participantsMen, setParticipantsMen] = useState<string[]>([]);
  const [participantsWomen, setParticipantsWomen] = useState<string[]>([]);
  const [profilePictures, setProfilePictures] = useState<Record<string, string>>({});
  const [playedInCurrentSet, setPlayedInCurrentSet] = useState<string[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);

  // Scoreboard states
  const [scoreMen, setScoreMen] = useState(0);
  const [scoreWomen, setScoreWomen] = useState(0);
  const [activeTeam, setActiveTeam] = useState<'MEN' | 'WOMEN' | null>(null);

  const maxMistakes = cardCount === 6 ? 3 : (cardCount === 8 ? 5 : 10);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('tiktok_status', (data) => {
      setTiktokConnected(data.connected);
      if (data.connected) setTiktokError('');
      if (data.username) setTiktokUsername(data.username);
    });

    newSocket.on('tiktok_error', (data) => {
      setTiktokError(data.message);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const pickRandomPlayer = useCallback((team: 'MEN' | 'WOMEN') => {
    const list = team === 'MEN' ? participantsMen : participantsWomen;
    
    // We compute available outside the setState callback since we need it to be pure.
    // However, this means we rely on playedInCurrentSet being correct in the closure.
    // If multiple picks happen rapidly, relying on closure can be tricky, but here it's fine.
    
    let available = list.filter(u => !playedInCurrentSet.includes(u));
    let chosen: string | null = null;
    let shouldReset = false;

    if (available.length > 0) {
      const randomIndex = Math.floor(Math.random() * available.length);
      chosen = available[randomIndex];
    } else if (list.length > 0) {
      // All have played (or available is empty), reset the list and pick from everyone
      shouldReset = true;
      const randomIndex = Math.floor(Math.random() * list.length);
      chosen = list[randomIndex];
    }

    if (chosen) {
      setCurrentPlayer(chosen);
      setPlayedInCurrentSet(prev => {
        // If we decided to reset because everyone has played from this team
        if (shouldReset) {
          // We only want to reset players of the current team, wait,
          // actually the simplest way is to only keep players not in the current team
          // and then add the chosen one. Let's just filter out this team's players.
          const otherTeamPlayers = prev.filter(p => !list.includes(p));
          return [...otherTeamPlayers, chosen];
        }
        return prev.includes(chosen) ? prev : [...prev, chosen];
      });
    } else {
      setCurrentPlayer(null);
    }
  }, [participantsMen, participantsWomen, playedInCurrentSet]);

  const initializeGame = useCallback(() => {
    setPlayedInCurrentSet([]); // Reset played list for new game set
    let emojis = EMOJI_THEMES[currentTheme];
    
    // Choose pairs based on card count
    const pairsCount = cardCount / 2;
    const selectedEmojis = [...emojis].slice(0, pairsCount);

    // Duplicate emojis to make pairs and shuffle them
    const shuffledCards = [...selectedEmojis, ...selectedEmojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji) => ({ id: Math.random().toString(36).substr(2, 9), emoji }));
    
    setCards(shuffledCards);
    setFlippedIndices([]);
    setMatchedIndices([]);
    setMatchedBy({});
    setMistakes(0);
    setIsLocked(false);
    setCurrentPlayer(null);
  }, [currentTheme, cardCount]);

  const handleNextTurn = () => {
    setActiveTeam((prev) => prev === 'MEN' ? 'WOMEN' : prev === 'WOMEN' ? 'MEN' : 'MEN');
    initializeGame();
  };

  const handleRestart = () => {
    setActiveTeam(null);
    initializeGame();
  };

  const handleFlipAll = () => {
    setIsPeeking(true);
    setIsLocked(true);
    setTimeout(() => {
      setIsPeeking(false);
      setIsLocked(false);
    }, 1000);
  };

  const handleRemovePlayer = (team: 'MEN' | 'WOMEN', name: string) => {
    if (team === 'MEN') {
      setParticipantsMen((prev) => prev.filter((p) => p !== name));
    } else {
      setParticipantsWomen((prev) => prev.filter((p) => p !== name));
    }
  };

  const handleAutoWin = () => {
    const allIndices = cards.map((_, index) => index);
    setMatchedIndices(allIndices);
    
    const newMatchedBy: Record<number, 'MEN' | 'WOMEN'> = {};
    allIndices.forEach(idx => {
      newMatchedBy[idx] = matchedBy[idx] || activeTeam;
    });
    setMatchedBy(newMatchedBy);
    setFlippedIndices([]);
  };

  const handleAutoLose = () => {
    setMistakes(maxMistakes);
  };

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const isGameOver = mistakes >= maxMistakes;
  const isWin = matchedIndices.length === cards.length && cards.length > 0;

  useEffect(() => {
    if (isWin) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isWin]);

  const handleCardClick = (index: number) => {
    // Prevent interaction if no team selected, locked, game over, card is already matched or flipped
    if (
      activeTeam === null ||
      isLocked || 
      isGameOver || 
      isWin || 
      matchedIndices.includes(index) || 
      flippedIndices.includes(index)
    ) {
      return;
    }

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setIsLocked(true);
      const [firstIndex, secondIndex] = newFlipped;

      if (cards[firstIndex].emoji === cards[secondIndex].emoji) {
        // Match found (keep turn, add score)
        setTimeout(() => {
          setMatchedIndices((prev) => [...prev, firstIndex, secondIndex]);
          setMatchedBy((prev) => ({
            ...prev,
            [firstIndex]: activeTeam,
            [secondIndex]: activeTeam,
          }));
          
          if (activeTeam === 'MEN') {
            setScoreMen((prev) => prev + 1);
          } else {
            setScoreWomen((prev) => prev + 1);
          }

          setFlippedIndices([]);
          setIsLocked(false);
        }, 500);
      } else {
        // No match (switch turn)
        setTimeout(() => {
          setFlippedIndices([]);
          setMistakes((prev) => prev + 1);
          setIsLocked(false);
        }, 1000);
      }
    }
  };

  const handleRemoteFlip = useCallback((index1: number, index2: number) => {
    if (
      isLocked || 
      isGameOver || 
      isWin || 
      matchedIndices.includes(index1) || 
      matchedIndices.includes(index2) || 
      flippedIndices.includes(index1) ||
      flippedIndices.includes(index2)
    ) {
      return;
    }

    setIsLocked(true);
    setFlippedIndices([index1, index2]);

    if (cards[index1].emoji === cards[index2].emoji) {
      setTimeout(() => {
        setMatchedIndices((prev) => [...prev, index1, index2]);
        setMatchedBy((prev) => ({
          ...prev,
          [index1]: activeTeam,
          [index2]: activeTeam,
        }));
        
        if (activeTeam === 'MEN') {
          setScoreMen((prev) => prev + 1);
        } else {
          setScoreWomen((prev) => prev + 1);
        }

        // Keep current player on match? Usually yes.
        setFlippedIndices([]);
        setIsLocked(false);
      }, 500);
    } else {
      setTimeout(() => {
        setFlippedIndices([]);
        setMistakes((prev) => prev + 1);
        setIsLocked(false);

        // Remove automatic picking here
        setCurrentPlayer(null);
      }, 1000);
    }
  }, [isLocked, isGameOver, isWin, matchedIndices, flippedIndices, cards, activeTeam, participantsMen, participantsWomen, playedInCurrentSet, pickRandomPlayer]);

  useEffect(() => {
    if (!socket || cards.length === 0) return;

    const handleChat = (data: { username: string, comment: string, profilePictureUrl?: string }) => {
      const comment = data.comment.toUpperCase().trim();

      if (data.profilePictureUrl) {
        setProfilePictures(prev => ({ ...prev, [data.username]: data.profilePictureUrl as string }));
      }

      // Handle Registrations
      if (comment === 'TUAN') {
        setParticipantsMen(prev => {
          if (prev.includes(data.username)) return prev;
          const newList = [...prev, data.username];
          return newList;
        });
        return;
      }

      if (comment === 'PUAN') {
        setParticipantsWomen(prev => {
          if (prev.includes(data.username)) return prev;
          const newList = [...prev, data.username];
          return newList;
        });
        return;
      }

      // Restrict flipping to ONLY the current player shown in the turn indicator
      if ((!currentPlayer || data.username !== currentPlayer) && !isDevMode) return;

      // Regex to parse two numbers like "1 5", "1,5", or "1 and 5"
      const match = data.comment.match(/^(\d+)[^\d]+(\d+)$/);
      if (match) {
        const num1 = parseInt(match[1], 10);
        const num2 = parseInt(match[2], 10);
        
        if (num1 >= 1 && num1 <= cardCount && num2 >= 1 && num2 <= cardCount && num1 !== num2) {
           const index1 = num1 - 1;
           const index2 = num2 - 1;
           handleRemoteFlip(index1, index2);
        }
      }
    };

    socket.on('tiktok_chat', handleChat);
    return () => {
      socket.off('tiktok_chat', handleChat);
    };
  }, [socket, cardCount, cards.length, handleRemoteFlip, currentPlayer, activeTeam, participantsMen, participantsWomen, isDevMode]);

  const isGameStarted = flippedIndices.length > 0 || matchedIndices.length > 0 || mistakes > 0;

  return (
    <div className="min-h-screen bg-purple-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>

      {showWelcomePage ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10 w-full h-full">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, type: "spring", bounce: 0.5 }}
            className="flex flex-col items-center max-w-sm w-full p-10"
          >
            <motion.img 
              initial={{ rotate: -5 }}
              animate={{ rotate: 5 }}
              transition={{ repeat: Infinity, duration: 4, repeatType: "reverse", ease: "easeInOut" }}
              src="https://game-cdn.fitrimahadzir.my/emojiflip/logo.png" 
              alt="EmojiFlip Logo" 
              className="w-full h-auto drop-shadow-xl mb-8" 
            />
            
            {/* TikTok Live Setup */}
            <div className="w-full mb-8 flex flex-col gap-3">
              <label className="text-sm font-bold text-[#7C52A5] text-left uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4" /> TikTok Live Link
              </label>
              <div className="flex bg-white/60 rounded-xl border-2 border-[#7C52A5]/20 overflow-hidden focus-within:border-[#7C52A5] transition-colors">
                 <input 
                   type="text" 
                   placeholder="Enter TikTok Username" 
                   className="flex-1 w-full min-w-0 bg-transparent px-4 py-3 outline-none text-gray-800 placeholder-gray-500 font-medium"
                   value={tiktokUsername}
                   onChange={(e) => setTiktokUsername(e.target.value)}
                   disabled={tiktokConnected}
                 />
                 {tiktokConnected ? (
                   <button 
                     onClick={() => socket?.emit('tiktok_disconnect')}
                     className="bg-red-500 shrink-0 text-white px-4 font-bold hover:bg-red-600 transition-colors"
                   >
                     Disconnect
                   </button>
                 ) : (
                   <button 
                     onClick={() => {
                        if (tiktokUsername) socket?.emit('tiktok_connect', tiktokUsername);
                     }}
                     className="bg-[#7C52A5] shrink-0 text-white px-4 font-bold hover:bg-[#6c4691] transition-colors"
                   >
                     Connect
                   </button>
                 )}
              </div>
              {tiktokError && <p className="text-red-500 text-sm font-medium">{tiktokError}</p>}
              {tiktokConnected && <p className="text-[#7C52A5] text-sm font-medium bg-[#7C52A5]/10 px-3 py-2 rounded-lg border border-[#7C52A5]/20">✓ Listening to <strong>@{tiktokUsername}</strong>'s live chat for "1,2"</p>}
            </div>

            {/* Category and Card Count Dropdowns */}
            <div className="w-full flex flex-col gap-4 mb-8">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-[#7C52A5]/60 uppercase tracking-[0.2em] ml-1">Select Category</label>
                <div className="relative">
                  <select
                    value={currentTheme}
                    onChange={(e) => setCurrentTheme(e.target.value)}
                    className="w-full appearance-none bg-white/80 text-[#7C52A5] font-bold border-2 border-[#7C52A5]/20 rounded-2xl px-5 py-3.5 pr-10 shadow-sm focus:outline-none focus:ring-4 focus:ring-[#7C52A5]/10 cursor-pointer transition-all hover:border-[#7C52A5]/40"
                  >
                    {THEME_NAMES.map((theme) => (
                      <option key={theme} value={theme}>
                        {theme}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#7C52A5]">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-[#7C52A5]/60 uppercase tracking-[0.2em] ml-1">Card Total</label>
                <div className="relative">
                  <select
                    value={cardCount}
                    onChange={(e) => setCardCount(Number(e.target.value))}
                    className="w-full appearance-none bg-white/80 text-[#7C52A5] font-bold border-2 border-[#7C52A5]/20 rounded-2xl px-5 py-3.5 pr-10 shadow-sm focus:outline-none focus:ring-4 focus:ring-[#7C52A5]/10 cursor-pointer transition-all hover:border-[#7C52A5]/40"
                  >
                    <option value={6}>6 Cards (Easy)</option>
                    <option value={8}>8 Cards (Normal)</option>
                    <option value={12}>12 Cards (Hard)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#7C52A5]">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowWelcomePage(false)}
              className="w-full bg-gradient-to-br from-[#7C52A5] to-[#9c6ccb] text-white font-black text-2xl tracking-wider py-4 px-8 rounded-full shadow-[0_8px_30px_rgb(124,82,165,0.4)] hover:shadow-[0_12px_40px_rgb(124,82,165,0.6)] transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              <span className="relative z-10">PLAY</span>
              <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
            </motion.button>
          </motion.div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col relative z-10 w-full overflow-y-auto overflow-x-hidden">
          {/* Main Content */}
          <main className="flex-1 flex flex-col items-center p-4 pt-10 gap-6 w-full max-w-7xl mx-auto">

                {/* Turn Indicator with Integrated Scores */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center justify-center gap-2 sm:gap-4 w-full">
                    {/* TUAN Score (Left) */}
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex flex-col items-center justify-center w-32 h-20 rounded-2xl border transition-all select-none ${!isGameStarted ? 'cursor-pointer' : 'cursor-default'} ${
                        activeTeam === 'MEN' ? 'bg-blue-50/80 border-blue-500 shadow-sm' : 'bg-white/80 border-white shadow-sm hover:bg-white/50'
                      }`}
                      onClick={() => {
                        if (!isGameStarted && activeTeam !== 'MEN') {
                          setActiveTeam('MEN');
                          setCurrentPlayer(null);
                        }
                      }}
                    >
                      <span className={`text-[13px] font-black tracking-widest ${activeTeam === 'MEN' ? 'text-blue-600' : 'text-gray-400'}`}>TUAN</span>
                      <span className={`text-[36px] font-black leading-none mt-1 ${activeTeam === 'MEN' ? 'text-blue-700' : 'text-gray-300'}`}>{scoreMen}</span>
                    </motion.div>

                    <div className="shrink-0">
                      <AnimatePresence mode="wait">
                        <motion.div 
                          key={currentPlayer || 'empty'}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          whileHover={!isWin && !isGameOver ? { scale: 1.02 } : {}}
                          whileTap={!isWin && !isGameOver ? { scale: 0.98 } : {}}
                          onClick={() => {
                            if (!isWin && !isGameOver && !isPicking && activeTeam !== null) {
                              pickRandomPlayer(activeTeam);
                            }
                          }}
                          className={`px-8 py-3 rounded-2xl font-black text-white shadow-lg flex flex-col items-center gap-1 transition-all duration-500 min-w-[240px] select-none ${
                            !isWin && !isGameOver && activeTeam !== null ? 'cursor-pointer' : 'cursor-default'
                          } ${
                            activeTeam === null ? 'bg-gray-400 shadow-gray-200 grayscale opacity-80' : 
                            activeTeam === 'MEN' ? 'bg-blue-600 shadow-blue-200' : 'bg-pink-600 shadow-pink-200'
                          }`}
                        >
                          {activeTeam === null ? (
                            <>
                              <span className="text-[10px] opacity-70 tracking-[0.2em] uppercase">Game Ready</span>
                              <span className="text-xl flex items-center gap-2">
                                Select a Team
                              </span>
                            </>
                          ) : currentPlayer ? (
                            <div className="flex items-center justify-center gap-4">
                              {profilePictures[currentPlayer] && (
                                <img 
                                  src={profilePictures[currentPlayer]} 
                                  alt={currentPlayer} 
                                  className="w-16 h-16 rounded-full border-2 border-white/50 object-cover shadow-md bg-black/10"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <div className="flex flex-col items-start justify-center">
                                <span className="text-[10px] opacity-70 tracking-[0.2em] uppercase text-left">Current Turn</span>
                                <span className="text-xl font-bold">@{currentPlayer}</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="text-[10px] opacity-70 tracking-[0.2em] uppercase">Next Selection</span>
                              <span className="text-xl flex items-center gap-2">
                                <Trophy className="w-5 h-5" />
                                Pick a Player
                              </span>
                            </>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* PUAN Score (Right) */}
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex flex-col items-center justify-center w-32 h-20 rounded-2xl border transition-all select-none ${!isGameStarted ? 'cursor-pointer' : 'cursor-default'} ${
                        activeTeam === 'WOMEN' ? 'bg-pink-50/80 border-pink-500 shadow-sm' : 'bg-white/80 border-white shadow-sm hover:bg-white/50'
                      }`}
                      onClick={() => {
                        if (!isGameStarted && activeTeam !== 'WOMEN') {
                          setActiveTeam('WOMEN');
                          setCurrentPlayer(null);
                        }
                      }}
                    >
                      <span className={`text-[13px] font-black tracking-widest ${activeTeam === 'WOMEN' ? 'text-pink-600' : 'text-gray-400'}`}>PUAN</span>
                      <span className={`text-[36px] font-black leading-none mt-1 ${activeTeam === 'WOMEN' ? 'text-pink-700' : 'text-gray-300'}`}>{scoreWomen}</span>
                    </motion.div>
                  </div>
                  
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex flex-col items-center gap-2 mt-1">
                    <span>Comment <span className="text-[#7C52A5] font-black">"TUAN"</span> or <span className="text-[#7C52A5] font-black">"PUAN"</span> to join!</span>
                    <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-lg shadow-sm border border-[#7C52A5]/20">
                      <span className="text-[9px] text-[#7C52A5] font-semibold whitespace-nowrap">TO FLIP CARDS (EXAMPLE):</span>
                      <div className="flex bg-white rounded border border-[#7C52A5]/30 overflow-hidden shadow-inner">
                        <span className="px-2 py-1 text-[#7C52A5] font-mono text-xs font-bold border-r border-[#7C52A5]/20 bg-gray-50 text-center min-w-[36px]">1,2</span>
                        <span className="px-2 py-1 text-gray-400 font-mono text-[9px] border-r border-gray-200 flex items-center bg-white italic">or</span>
                        <span className="px-2 py-1 text-[#7C52A5] font-mono text-xs font-bold bg-gray-50 text-center min-w-[36px]">1 2</span>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Cards and Absolute Sidebars */}
              <div className="relative w-full max-w-lg mt-2 flex flex-col items-center bg-white/95 backdrop-blur-sm p-[10px] sm:p-4 rounded-[2rem] shadow-xl border border-gray-100">
                
                {/* Left Toggle Button Wrapper */}
                <div className="absolute top-0 bottom-0 left-0 z-30 pointer-events-none">
                  <button 
                    onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                    className={`absolute top-1/2 left-0 transition-transform duration-300 bg-blue-600 hover:bg-blue-700 text-white rounded-l-xl py-6 px-1 shadow-md pointer-events-auto
                      ${showLeftSidebar ? 'translate-x-[calc(-100%-16.5rem)] -translate-y-1/2' : '-translate-x-full -translate-y-1/2'}
                    `}
                  >
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="font-black tracking-wider text-[10px]">TUAN</div>
                  </button>
                </div>

                {/* Left Sidebar Absolute */}
                <div 
                  className={`absolute top-0 bottom-0 left-0 transition-all duration-300 z-20 flex flex-col shadow-lg border border-white/50 bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden
                    ${showLeftSidebar ? 'w-64 -translate-x-[calc(100%+10px)] opacity-100 p-3' : 'w-0 translate-x-0 opacity-0 pointer-events-none p-0 border-none'}
                  `}
                >
                  <div className="w-[calc(16rem-1.5rem)] h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 relative">
                      <AnimatePresence>
                        {participantsMen.map((name, i) => (
                          <motion.div 
                            key={name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={`px-3 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-between group has-[button:hover]:!bg-red-100 has-[button:hover]:!text-red-900 has-[button:hover]:!opacity-100 ${
                              currentPlayer === name 
                                ? (activeTeam === 'MEN' ? 'bg-blue-500 text-white shadow-md scale-105' : 'bg-pink-500 text-white shadow-md scale-105') 
                                : (playedInCurrentSet.includes(name) ? 'bg-gray-100 text-gray-400 opacity-50' : 'bg-white/50 text-blue-800')
                            }`}
                          >
                            <span className="truncate flex-1 text-left">
                              {i + 1}. {name} {currentPlayer === name && '🎮'}
                              {playedInCurrentSet.includes(name) && currentPlayer !== name && ' (Used)'}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemovePlayer('MEN', name); }}
                              className="opacity-0 group-hover:opacity-100 transition-colors ml-2 p-1 hover:!bg-red-800 hover:!text-white rounded-full shrink-0 outline-none"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {participantsMen.length === 0 && <p className="text-center text-xs text-blue-400 mt-4 font-medium italic">Comment "TUAN" to join!</p>}
                    </div>
                  </div>
                </div>

                {/* Cards Grid */}
                <div className={`w-full z-10 transition-all duration-500 relative ${activeTeam === null ? 'grayscale opacity-80 pointer-events-none' : ''}`}>
                  {/* Ghost grid to force height of 12 cards */}
                  <div className="grid gap-3 sm:gap-[10px] grid-cols-3 sm:grid-cols-4 opacity-0 pointer-events-none invisible w-full">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="w-full aspect-square" />
                    ))}
                  </div>

                  {/* Real Grid */}
                  <div className={`absolute inset-0 grid gap-3 sm:gap-[10px] content-center ${
                    cardCount === 6 ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-4'
                  }`}>
                    {cards.map((card, index) => (
                      <Card
                        key={card.id}
                        emoji={card.emoji}
                        number={index + 1}
                        isFlipped={isPeeking || flippedIndices.includes(index) || matchedIndices.includes(index)}
                        isMatched={matchedIndices.includes(index)}
                        matchedBy={matchedBy[index]}
                        activeTeam={activeTeam}
                        onClick={() => handleCardClick(index)}
                      />
                    ))}
                  </div>
                </div>

                {/* Right Sidebar Absolute */}
                <div 
                  className={`absolute top-0 bottom-0 right-0 transition-all duration-300 z-20 flex flex-col shadow-lg border border-white/50 bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden
                    ${showRightSidebar ? 'w-64 translate-x-[calc(100%+10px)] opacity-100 p-3' : 'w-0 -translate-x-0 opacity-0 pointer-events-none p-0 border-none'}
                  `}
                >
                  <div className="w-[calc(16rem-1.5rem)] h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 relative">
                      <AnimatePresence>
                        {participantsWomen.map((name, i) => (
                          <motion.div 
                            key={name}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className={`px-3 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-between group has-[button:hover]:!bg-red-100 has-[button:hover]:!text-red-900 has-[button:hover]:!opacity-100 ${
                              currentPlayer === name 
                                ? (activeTeam === 'WOMEN' ? 'bg-pink-500 text-white shadow-md scale-105' : 'bg-blue-500 text-white shadow-md scale-105') 
                                : (playedInCurrentSet.includes(name) ? 'bg-gray-100 text-gray-400 opacity-50' : 'bg-white/50 text-pink-800')
                            }`}
                          >
                            <span className="truncate flex-1 text-left">
                              {i + 1}. {name} {currentPlayer === name && '🎮'}
                              {playedInCurrentSet.includes(name) && currentPlayer !== name && ' (Used)'}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemovePlayer('WOMEN', name); }}
                              className="opacity-0 group-hover:opacity-100 transition-colors ml-2 p-1 hover:!bg-red-800 hover:!text-white rounded-full shrink-0 outline-none"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {participantsWomen.length === 0 && <p className="text-center text-xs text-pink-400 mt-4 font-medium italic">Comment "PUAN" to join!</p>}
                    </div>
                  </div>
                </div>

                {/* Right Toggle Button Wrapper */}
                <div className="absolute top-0 bottom-0 right-0 z-30 pointer-events-none">
                  <button 
                    onClick={() => setShowRightSidebar(!showRightSidebar)}
                    className={`absolute top-1/2 right-0 transition-transform duration-300 bg-pink-600 hover:bg-pink-700 text-white rounded-r-xl py-6 px-1 shadow-md pointer-events-auto
                      ${showRightSidebar ? 'translate-x-[calc(100%+16.5rem)] -translate-y-1/2' : 'translate-x-full -translate-y-1/2'}
                    `}
                  >
                    <div style={{ writingMode: 'vertical-rl' }} className="font-black tracking-wider text-[10px]">PUAN</div>
                  </button>
                </div>

              </div>

              {/* Mistakes and Game Controls */}
              <div className="w-full max-w-lg mt-2 flex justify-between items-center bg-white/80 backdrop-blur-sm px-5 py-3 rounded-2xl shadow-sm border border-white/50">
                <div className="text-gray-700 font-bold flex items-center gap-3">
                  <div>Mistakes: <span className="text-red-500">{mistakes}</span> <span className="text-gray-400">/ {maxMistakes}</span></div>
                  
                  {isDevMode && (
                    <select
                      value={cardCount}
                      onChange={(e) => setCardCount(Number(e.target.value))}
                      className="appearance-none bg-white/80 text-xs text-[#7C52A5] font-bold border border-[#7C52A5]/20 rounded-md px-2 py-1 pr-6 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7C52A5]/10 cursor-pointer hover:border-[#7C52A5]/40"
                    >
                      <option value={6}>6 Cards</option>
                      <option value={8}>8 Cards</option>
                      <option value={12}>12 Cards</option>
                    </select>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleFlipAll}
                    disabled={isPeeking || isLocked}
                    className="flex items-center gap-2 bg-[#7C52A5]/10 text-[#7C52A5] px-4 py-2 rounded-full font-bold hover:bg-[#7C52A5] hover:text-white transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Flip All</span>
                  </button>
                  <button 
                    onClick={handleRestart}
                    className="flex items-center gap-2 bg-[#7C52A5]/10 text-[#7C52A5] px-4 py-2 rounded-full font-bold hover:bg-[#7C52A5] hover:text-white transition-colors text-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restart</span>
                  </button>
                </div>
              </div>

            </main>

            {/* Footer */}
            <footer className="text-center py-6 text-gray-500 text-sm">
              <p>
                &copy; 2026 Developed By <a href="https://fitrimahadzir.my" target="_blank" rel="noopener noreferrer" className="text-[#7C52A5] hover:underline font-medium">Fitri Mahadzir</a>
              </p>
              
              {ENABLE_DEV_MODE && (
                <div className="mt-6 flex flex-col items-center justify-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={isDevMode} 
                      onChange={(e) => setIsDevMode(e.target.checked)} 
                      className="w-3 h-3 text-[#7C52A5] rounded border-gray-300 focus:ring-[#7C52A5]"
                    />
                    <span>Dev Mode</span>
                  </label>
                  
                  {isDevMode && (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex gap-2">
                        <button 
                          onClick={handleAutoWin}
                          className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded shadow-sm hover:bg-green-200 transition-colors"
                        >
                          Auto Win
                        </button>
                        <button 
                          onClick={handleAutoLose}
                          className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded shadow-sm hover:bg-red-200 transition-colors"
                        >
                          Auto Lose
                        </button>
                      </div>

                      <div className="flex flex-col gap-2 w-full max-w-xs">
                        <select 
                          value={simUser}
                          onChange={(e) => setSimUser(e.target.value)}
                          className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg shadow-sm outline-none"
                        >
                          {TEST_USERS.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>

                        <div className="flex bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                          <input 
                            type="text" 
                            placeholder="Simulate: 'TUAN', 'PUAN' or '1 5'" 
                            className="px-3 py-1 text-xs outline-none flex-1"
                            value={simComment}
                            onChange={(e) => setSimComment(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && simComment) {
                                socket?.emit('simulate_chat', { username: simUser, comment: simComment });
                                setSimComment('');
                              }
                            }}
                          />
                          <button 
                            onClick={() => {
                              if (simComment) {
                                socket?.emit('simulate_chat', { username: simUser, comment: simComment });
                                setSimComment('');
                              }
                            }}
                            className="bg-gray-800 text-white px-3 py-1 text-xs font-bold"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400">First register with 'TUAN' or 'PUAN', then type numbers</p>
                    </div>
                  )}
                </div>
              )}
            </footer>
        </div>
      )}

      {/* Game Over Modal */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center"
            >
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Warning ⚠️</h2>
              <p className="text-gray-600 mb-6 font-medium">
                You have reached {maxMistakes} mistakes!
              </p>
              <button
                onClick={handleNextTurn}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Next Turn
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Win Modal */}
      <AnimatePresence>
        {isWin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center"
            >
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-500">
                <Trophy className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Congratulations! 🎉</h2>
              <p className="text-gray-600 mb-6 font-medium">
                You have found all pairs with {mistakes} mistakes.
              </p>
              <button
                onClick={handleNextTurn}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Next Turn
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
