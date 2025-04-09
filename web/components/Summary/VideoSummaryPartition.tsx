"use client"
import { ModeToggle } from "../theme/mode-toggle";
import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import Markdown from "react-markdown";
import { useState, useEffect } from "react";
import QuizDialog from "./Quiz";
import { useSummaryContext } from "./SummaryProvider";
import { Loader2 } from "lucide-react";
import "./VideoSummaryPartition.css"

const USE_API = true;
const staticSummary = ` 
## Video Summary
This is a static summary of the video. It covers key points and provides an overview of the content.
- Point 1: Introduction to the topic.
- Point 2: Explanation of key concepts.
- Point 3: Conclusion and takeaways.
`;


function EmbedVideo({ videoId }: { videoId: string }) {
  return (
    <iframe 
      width="560" 
      height="315" 
      src={`https://www.youtube.com/embed/${videoId}`} 
      title="YouTube video player" 
      frameBorder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
      referrerPolicy="strict-origin-when-cross-origin" 
      allowFullScreen
    >
    </iframe>
  )
}

export default function VideoSummaryPartition() {
  const [quizOpen, setQuizOpen] = useState(false);
  const [summary, setSummary] = useState("Loading summary...");
  const [processingStep, setProcessingStep] = useState<string>("initializing");
  const [isLoading, setIsLoading] = useState(true);
  const { videoId } = useSummaryContext();
  const staticSummary = ` 
  ## Video Summary
  This is a static summary of the video. It covers key points and provides an overview of the content.
  - Point 1: Introduction to the topic.
  - Point 2: Explanation of key concepts.
  - Point 3: Conclusion and takeaways.
  `;
  useEffect(() => {
    if (!videoId) return;

    async function processVideo() {
      try {
        setProcessingStep("processing");

        // Build the video URL from the videoId
        const videoUrl = `https://youtube.com/watch?v=${videoId}`;

        // First, process the video
        const processResponse = await fetch("https://021c-106-194-240-111.ngrok-free.app/process_video/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ video_url: videoUrl }),
        });

        if (!processResponse.ok) {
          const errorData = await processResponse.json();
          throw new Error(errorData.detail || "Failed to process video");
        }

        // After successful processing, fetch the summary
        await fetchSummary();
      } catch (error) {
        setIsLoading(false);
        setSummary(`Error processing video: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    async function fetchSummary() {
      try {
        setProcessingStep("summarizing");

        const response = await fetch("https://021c-106-194-240-111.ngrok-free.app/summarize_video/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ video_id: videoId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to fetch summary");
        }

        const data = await response.json();
        setSummary(data.summary);
      } catch (error) {
        setSummary(`Error loading summary: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
        setIsLoading(false);
      }
    }

    // toggle the comment sequence to view the summary
    if (USE_API) {
      processVideo();
    } else {
      setSummary(staticSummary);
      setIsLoading(false);
    }
  }, [videoId]);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex justify-between w-full items-center px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-2xl font-bold">Summary</h1>
          </div>
          <ModeToggle />
        </div>
      </header>
      <Button
        onClick={() => setQuizOpen(true)}
        className="absolute bottom-4 right-4 z-10"
        size="lg"
      >
        Take a Quiz
      </Button>
      <QuizDialog open={quizOpen} onOpenChange={setQuizOpen} />
      <ScrollArea>
        <div className="flex flex-col gap-4 p-4 prose lg:prose-lg text-foreground">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>
                {processingStep === "processing"
                  ? "Processing video content..."
                  : "Generating summary..."}
              </p>
            </div>
          ) : (
            <>
            <EmbedVideo videoId={videoId as string}/>
            <p className="text-primary-foreground">
            <Markdown>{summary}</Markdown>
            </p>
            </>
          )}
        </div>
      </ScrollArea>
    </>
  );
}
