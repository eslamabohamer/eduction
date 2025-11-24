import { useEffect, useRef, useState } from 'react';
import { videoService } from '@/services/videoService';
import { Loader2, AlertCircle } from 'lucide-react';

interface Props {
    videoId: string;
    storagePath: string;
    title: string;
    onComplete?: () => void;
}

export function VideoPlayer({ videoId, storagePath, title, onComplete }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const progressInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        loadVideo();
        return () => {
            if (progressInterval.current) clearInterval(progressInterval.current);
        };
    }, [videoId]);

    async function loadVideo() {
        try {
            setLoading(true);
            setError(null);
            const urlResponse = await videoService.getVideoUrl(storagePath);
            if (urlResponse.success && urlResponse.data) {
                setVideoUrl(urlResponse.data);
            } else {
                setError('فشل تحميل رابط الفيديو');
                return;
            }

            // Load initial progress
            const progressResponse = await videoService.getProgress(videoId);
            if (progressResponse.success && progressResponse.data && videoRef.current) {
                videoRef.current.currentTime = progressResponse.data.progress_seconds;
            }
        } catch (err) {
            console.error(err);
            setError('فشل تحميل الفيديو');
        } finally {
            setLoading(false);
        }
    }

    function handleTimeUpdate() {
        if (!videoRef.current) return;
        // Progress saving logic is handled in handlePlay interval
    }

    function handlePlay() {
        // Start tracking interval
        if (progressInterval.current) clearInterval(progressInterval.current);
        progressInterval.current = setInterval(() => {
            if (videoRef.current) {
                const currentTime = Math.floor(videoRef.current.currentTime);
                const duration = Math.floor(videoRef.current.duration);
                const isCompleted = currentTime >= duration - 10; // Consider completed if within last 10s

                videoService.updateProgress(videoId, currentTime, isCompleted);

                if (isCompleted && onComplete) {
                    onComplete();
                }
            }
        }, 5000); // Update every 5 seconds
    }

    function handlePause() {
        if (progressInterval.current) clearInterval(progressInterval.current);
        // Save immediately on pause
        if (videoRef.current) {
            videoService.updateProgress(
                videoId,
                Math.floor(videoRef.current.currentTime),
                false
            );
        }
    }

    function handleEnded() {
        if (progressInterval.current) clearInterval(progressInterval.current);
        if (videoRef.current) {
            videoService.updateProgress(
                videoId,
                Math.floor(videoRef.current.duration),
                true
            );
        }
        if (onComplete) onComplete();
    }

    if (loading) {
        return (
            <div className="w-full aspect-video bg-black/5 flex items-center justify-center rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full aspect-video bg-black/5 flex flex-col items-center justify-center rounded-lg text-destructive gap-2">
                <AlertCircle className="h-8 w-8" />
                <span>{error}</span>
                <button onClick={loadVideo} className="text-sm underline">إعادة المحاولة</button>
            </div>
        );
    }

    return (
        <div className="relative rounded-lg overflow-hidden bg-black shadow-lg">
            <video
                ref={videoRef}
                src={videoUrl || ''}
                className="w-full h-full"
                controls
                controlsList="nodownload"
                onTimeUpdate={handleTimeUpdate}
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={handleEnded}
                title={title}
            >
                Your browser does not support the video tag.
            </video>
        </div>
    );
}
