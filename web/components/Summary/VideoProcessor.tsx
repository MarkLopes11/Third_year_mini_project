"use client";
// unused code
import { useEffect, useState } from 'react';
import { useSummaryContext } from "./SummaryProvider";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";


export default function VideoProcessor({ onProcessComplete }) {
  const { videoId } = useSummaryContext();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    // Reset states when videoId changes
    if (videoId) {
      setCompleted(false);
      setError(null);
      processVideo();
    }
  }, [videoId]);

  const processVideo = async () => {
    if (!videoId) {
      setError("No video selected");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Process video first
      const processResponse = await fetch("https://021c-106-194-240-111.ngrok-free.app/process_video/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_url: videoUrl }),
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.detail || "Failed to process video");
      }

      // Mark as completed
      setCompleted(true);
      if (onProcessComplete) {
        onProcessComplete();
      }
    } catch (err: any) {
      console.error("Error processing video:", err);
      setError(err.message || "Failed to process video");
    } finally {
      setProcessing(false);
    }
  };

  if (completed) {
    return null; // Hide when completed
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 gap-4 border rounded-lg bg-destructive/10 text-destructive">
        <p>{error}</p>
        <Button onClick={processVideo} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-6 gap-4 ${processing ? 'border rounded-lg' : ''}`}>
      {processing ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-center">Processing video...</p>
          <p className="text-center text-sm text-muted-foreground">
            This may take a moment as we analyze the video content.
          </p>
        </>
      ) : !videoId ? (
        <p className="text-center text-muted-foreground">Select a video to continue</p>
      ) : null}
    </div>
  );
}