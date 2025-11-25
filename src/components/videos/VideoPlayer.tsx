import { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { videoLessonService, VideoProgress } from '@/services/videoLessonService';
import { Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  lessonId: string;
  initialProgress?: VideoProgress | null;
  onProgressUpdate?: (progress: number) => void;
}

export function VideoPlayer({ url, lessonId, initialProgress, onProgressUpdate }: VideoPlayerProps) {
  const playerRef = useRef<ReactPlayer>(null);
  const [ready, setReady] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(0);
  const saveInterval = 10; // Save every 10 seconds

  const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
    const currentTime = state.playedSeconds;
    const percentage = Math.round(state.played * 100);

    if (onProgressUpdate) onProgressUpdate(percentage);

    // Save progress periodically
    if (currentTime - lastSavedTime > saveInterval) {
      saveProgress(currentTime, state.played, false);
      setLastSavedTime(currentTime);
    }
  };

  const handleEnded = () => {
    if (playerRef.current) {
      const duration = playerRef.current.getDuration();
      saveProgress(duration, 1, true);
    }
  };

  const saveProgress = async (currentTime: number, playedRatio: number, isCompleted: boolean) => {
    if (!playerRef.current) return;
    const totalDuration = playerRef.current.getDuration();

    await videoLessonService.updateProgress(lessonId, {
      currentTime: Math.round(currentTime),
      totalDuration: Math.round(totalDuration),
      percentage: Math.round(playedRatio * 100),
      isCompleted
    });
  };

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-white z-10">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
      <ReactPlayer
        ref={playerRef}
        url={url}
        width="100%"
        height="100%"
        controls
        onReady={() => {
          setReady(true);
          // Seek to last position if available and not completed
          if (initialProgress && !initialProgress.is_completed && initialProgress.current_time > 0) {
            playerRef.current?.seekTo(initialProgress.current_time);
          }
        }}
        onProgress={handleProgress}
        onEnded={handleEnded}
        config={{
          youtube: {
            playerVars: { showinfo: 1 }
          },
          file: {
            attributes: {
              controlsList: 'nodownload'
            }
          }
        }}
      />
    </div>
  );
}
