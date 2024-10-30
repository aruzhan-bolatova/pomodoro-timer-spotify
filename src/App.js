import React, { useState, useEffect, useRef } from 'react';
import { fetchSpotifyToken } from './spotifyAuth';
import { Play, Pause, RotateCcw, Coffee, SkipForward } from 'lucide-react';
import { AnimatedBackground } from 'animated-backgrounds';
import './App.css';

// Constants for timer settings
const FOCUS_TIME = 25 * 60; // 25 minutes in seconds
const BREAK_TIME = 5 * 60;  // 5 minutes in seconds

const PomodoroTimer = () => {
  // Timer, Mode, and Music State
  const [mode, setMode] = useState('focus'); // Current mode: 'focus' or 'break'
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME); // Time left in seconds
  const [isActive, setIsActive] = useState(false); // Timer active status
  const [cycles, setCycles] = useState(0); // Count of focus cycles completed
  const [randomFact, setRandomFact] = useState(''); // Random Fact
  const [animation, setAnimation] = useState('particleNetwork'); // Background animation
  
  // Spotify and Music State
  const [accessToken, setAccessToken] = useState(null); //Spotify API authentication token
  const [focusPlaylist, setFocusPlaylist] = useState(null); //Playlist data for focus mode
  const [breakPlaylist, setBreakPlaylist] = useState(null);  //Playlist data for break mode
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);  //Index of current playing track
  const [isPlaying, setIsPlaying] = useState(false);  //Music playback status
  const audioRef = useRef(new Audio()); // Audio player reference for music control (everything with audioRef is chatGPT, fetching playlists was coded by me)

  // Fetches RandomFact from API, and displayed during break sessions to help change focus from study to break
  const fetchRandomFact = async () => {
    try {
      const response = await fetch('https://api.api-ninjas.com/v1/facts', {
        headers: {'X-Api-Key': process.env.REACT_APP_FACT_API}
      });
      const data = await response.json();
      if (data.length > 0) {
        setRandomFact(data[0].fact);
      }
    } catch (error) {
      console.error('Error fetching RandomFact:', error);
    }
  };

  // Fetches Spotify authentication token (component in spotifyAuth.js)
  useEffect(() => {
    fetchSpotifyToken().then(setAccessToken);
  }, []);

  // Fetch Spotify playlists based on the mode: calming music during focus and cheersul pop music during break time
  useEffect(() => {
    const fetchPlaylists = async () => {
      if (!accessToken) return;
      try {
        // Fetch focus playlist - Deep Focus
        const focusResponse = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DWZeKCadgRdKQ', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        
        // Fetch break playlist - Cheerful Uplifting Mix
        const breakResponse = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1EIcqv6dNT3Dgk', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        const focusData = await focusResponse.json();  
        const breakData = await breakResponse.json();
        
        setFocusPlaylist(focusData);
        setBreakPlaylist(breakData);

      } catch (error) {
        console.error('Failed to fetch playlists:', error);
      }
    };
    fetchPlaylists();
  }, [accessToken]);

  // Get available tracks with preview URLs for current mode
  const getAvailableTracks = () => {
    const currentPlaylist = mode === 'focus' ? focusPlaylist : breakPlaylist;
    if (!currentPlaylist || !currentPlaylist.tracks || !currentPlaylist.tracks.items) return [];  //error handling
    return currentPlaylist.tracks.items.filter(item => item.track.preview_url);  
  };

  // Audio Player Logic  
  // Handles audio player events and cleanup
  // Sets up auto-play for next track when current track ends
  useEffect(() => {
    const audio = audioRef.current;
    
    const handleTrackEnd = () => {
      playNextTrack();
    };

    audio.addEventListener('ended', handleTrackEnd);

    return () => {
      audio.removeEventListener('ended', handleTrackEnd);
      audio.pause();
    };
  }, []);

  // Timer logic
  useEffect(() => {
    let interval = null;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);  //timer decrements
    } else if (timeLeft === 0) {  //if time is up
      if (mode === 'focus') {   //if currently in focus mode, switch to break and update cycle, fetch random fact, change backfround, change playlist
        setCycles(c => c + 1);
        setMode('break');
        setTimeLeft(BREAK_TIME);
        fetchRandomFact();
        setAnimation('floatingBubbles');
        // Switch to break playlist music
        setCurrentTrackIndex(0);
        if (isPlaying) {
          setTimeout(() => playTrack(0), 0);
        }
      } else {  //if currently in break mode, switch to focus mode and remove fact, change backfround, change playlist
        setMode('focus');
        setTimeLeft(FOCUS_TIME);
        setRandomFact('');
        setAnimation('particleNetwork');
        // Switch to focus playlist music
        setCurrentTrackIndex(0);
        if (isPlaying) {
          setTimeout(() => playTrack(0), 0);
        }
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  // Playback functions
  const playTrack = (index) => {
    const availableTracks = getAvailableTracks();
    if (availableTracks.length === 0) return;
    
    const track = availableTracks[index];
    if (!track || !track.track.preview_url) {
      playNextTrack();
      return;
    }

    audioRef.current.src = track.track.preview_url;
    audioRef.current.play().catch(error => {
      console.error("Playback failed:", error);
      playNextTrack();
    });
    setIsPlaying(true);
  };

  const playNextTrack = () => {
    const availableTracks = getAvailableTracks();
    const nextIndex = (currentTrackIndex + 1) % availableTracks.length;
    setCurrentTrackIndex(nextIndex);
    playTrack(nextIndex);
  };

  const togglePlay = () => {
    if (!isPlaying) {
      playTrack(currentTrackIndex);
    } else {
      audioRef.current.pause();
    }
    setIsPlaying(!isPlaying);
  };

  // Function to get information about the trach currently playing
  const getCurrentTrackInfo = () => {
    const availableTracks = getAvailableTracks();
    if (availableTracks.length === 0) return { name: 'No preview available', artist: '' }; 
    const track = availableTracks[currentTrackIndex]?.track;
    return {
      name: track?.name || 'Unknown',
      artist: track?.artists?.[0]?.name || 'Unknown Artist'
    };
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle mode switch between focus and break
  const handleModeSwitch = () => {
    const switchingToBreak = mode === 'focus';
    setMode(switchingToBreak ? 'break' : 'focus');
    setTimeLeft(switchingToBreak ? BREAK_TIME : FOCUS_TIME);
    setIsActive(false);
    setCurrentTrackIndex(0); 
    if (isPlaying) {
      setTimeout(() => playTrack(0), 0);
    }
    if (switchingToBreak) {   //if break time
      fetchRandomFact();  //fetch random fact
      setAnimation('floatingBubbles'); //animation changes based on mode
    } else {
      setRandomFact('');  //set random fact to empty, so it does not display
      setAnimation('particleNetwork'); //animation changes based on mode
    }
  };

  const trackInfo = getCurrentTrackInfo();

  return (
    <div className="app">
      <AnimatedBackground animationName={animation} />
      <div className="timer-card">
         {/* timer mode text component */}
        <h1 className="title">
          {mode === 'focus' ? 'Focus Time' : 'Break Time'}
        </h1>
        
        {/* timer component */}
        <div className="time">
          {formatTime(timeLeft)}
        </div>

        {/* track info component */}
        <div className="track-info">                                
          <div className="track-name">{trackInfo.name}</div>        {/* displays track name */}
          <div className="track-artist">{trackInfo.artist}</div>    {/* displays track artist */}
        </div>

         {/* buttons component */}
        <div className="buttons">

          {/* button to start or pause timer */}
          <button onClick={() => setIsActive(!isActive)}>
            {isActive ? <Pause /> : <Play />}
          </button>
          
          {/* button to restart timer */}
          <button onClick={() => {
            setIsActive(false);
            setTimeLeft(mode === 'focus' ? FOCUS_TIME : BREAK_TIME);
          }}>
            <RotateCcw />
          </button>
          
          {/* button to switch modes*/}
          <button onClick={handleModeSwitch}>
            <Coffee />
          </button>
          
          {/* music control buttons */}
          <button onClick={togglePlay}>
            {isPlaying ? <Pause /> : <Play />}
          </button>

          <button onClick={playNextTrack}>
            <SkipForward />
          </button>
        </div>

        {/* cycle counter component */}
        <div className="stats">
          Cycles: {cycles}
        </div>

        {/* Random Fact component displays only when mode == break */}
        {mode === 'break' && randomFact && (
          <div className="randomFact">
            "{randomFact}"
          </div>
        )}
      </div>
    </div>
  );
};

export default PomodoroTimer;