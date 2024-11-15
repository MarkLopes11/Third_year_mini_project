import os
import re
import json
import logging
from typing import Tuple, Optional, List, Dict
from dataclasses import dataclass
import random
import yt_dlp
import assemblyai as aai
from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, GoogleGenerativeAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

load_dotenv(override=True)


@dataclass
class Config:
    BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))
    MEDIA_DIR: str = os.path.join(BASE_DIR, "media")
    TRANSCRIPT_DIR: str = os.path.join(BASE_DIR, "transcripts")
    FAISS_INDEX_DIR: str = os.path.join(BASE_DIR, "faiss_index")

    def __post_init__(self):
        for directory in [self.MEDIA_DIR, self.TRANSCRIPT_DIR, self.FAISS_INDEX_DIR]:
            os.makedirs(directory, exist_ok=True)


class YouTube:
    TRANSCRIPT_DIR = "transcripts/"

    def __init__(self):
        load_dotenv()
        self.config = Config()
        self.title = None
        self.vectordb = None
        self.transcript = None
        self._setup_ai_models()
        self._setup_assemblyai()

    def _setup_ai_models(self):
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001", dimensions=1536
        )
        self.llm = GoogleGenerativeAI(model="gemini-pro", temperature=0.1)

    def _setup_assemblyai(self):
        aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        sanitized = re.sub(r'[<>:"/\\|?*]', "", filename)
        return sanitized.replace(" ", "_")

    def save_transcript(self, transcript: str, video_title: str) -> str:
        safe_title = self.sanitize_filename(video_title)
        transcript_path = os.path.join(self.config.TRANSCRIPT_DIR, f"{safe_title}.txt")
        try:
            with open(transcript_path, "w", encoding="utf-8") as f:
                f.write(transcript)
            return transcript_path
        except Exception as e:
            print(f"Error saving transcript: {str(e)}")
            return ""

    def download_audio(self, youtube_url: str) -> Tuple[Optional[str], Optional[str]]:
        try:
            ydl_opts = {
                "format": "bestaudio/best",
                "outtmpl": os.path.join(self.config.MEDIA_DIR, "%(id)s.%(ext)s"),
                "postprocessors": [],
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(youtube_url, download=True)
                return (
                    os.path.join(self.config.MEDIA_DIR, f"{info['id']}.{info['ext']}"),
                    info["title"],
                )
        except Exception as e:
            print(f"Error downloading audio: {str(e)}")
            return None, None

    def get_transcription(self, youtube_url: str):
        audio_file, video_title = self.download_audio(youtube_url)
        if not audio_file:
            return None, None

        try:
            transcriber = aai.Transcriber()
            transcript = transcriber.transcribe(audio_file)

            if transcript.text:
                transcript_path = self.save_transcript(transcript.text, video_title)
                if transcript_path:
                    print(f"Transcript saved to: {transcript_path}")

                self.transcript = transcript.text
                self.title = video_title

            return transcript.text, video_title
        except Exception as e:
            print(f"Error transcribing audio: {str(e)}")
            return None, None

    def create_vectorstore(self, text: str) -> FAISS:
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, chunk_overlap=10, length_function=len
        )
        chunks = text_splitter.split_text(text)
        vectorstore = FAISS.from_texts(texts=chunks, embedding=self.embeddings)
        vectorstore.save_local(self.config.FAISS_INDEX_DIR)
        self.vectordb = vectorstore

    def qna_on_yt_video(self, question: str, k: int = 6) -> str:
        prompt_template = PromptTemplate(
            template="""Answer the user's question in a clear, informative, and helpful way,
            as if you are an expert about the topic.
            User Question: {question}

            If the transcript doesn't contain relevant information to answer the question, respond with:
            "I'm sorry, but the information provided doesn't contain details about that topic. Let me know if you have any other questions I can assist with."

            Otherwise, provide a thorough explanation that addresses the user's question.
            Use simple language, provide examples, and break down complex topics into easy-to-understand steps.
            Feel free to include links to relevant resources if that would be helpful.""",
            input_variables=["question"],
        )

        llm_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.vectordb.as_retriever(
                search_type="similarity", search_kwargs={"k": k}
            ),
            chain_type_kwargs={"prompt": prompt_template},
        )

        try:
            response = llm_chain(question)
            return response
        except Exception as e:
            print(f"Error generating answer: {str(e)}")
            return "Error generating the answer."

    def get_summary(self):
        if not self.transcript or not self.title:
            print("No transcript or title available. Please transcribe a video first.")
            return None

        prompt = f"""
        "Please provide a concise and clear summary of the following YouTube video transcript:
            Title: {self.title}
            Transcript: {self.transcript}
            Your summary should:
            Begin with the title of the video.
            Summarize the key points and main takeaways from the transcript.
            Ensure that the essence of the video is captured, focusing on the most important information.
            Keep the summary under 100 words, ensuring it remains both informative and concise.
            Avoid including unnecessary details while making sure no critical points are left out"
        """
        try:
            response = self.llm.invoke(prompt)
            return response
        except Exception as e:
            print(f"Error generating summary: {str(e)}")
            return None

    def generate_quiz(self) -> List[Dict]:
        try:
            quiz = self._generate_quiz_questions()
            if quiz:
                quiz_path = os.path.join(self.TRANSCRIPT_DIR, "Quiz.txt")
                with open(quiz_path, 'w', encoding='utf-8') as f:
                    f.write(str(quiz))
            
            return quiz
        except Exception as e:
            print(f"Error generating quiz: {str(e)}")
            return []

    def _generate_quiz_questions(self) -> List[Dict]:
        """Internal method to generate quiz questions."""
        prompt = f"""
        Create 5 multiple-choice questions based on this transcript.{self.transcript}
        Return them in this exact format:
        [
            {{"question": "Question text here?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "answer": "Correct option here"}}
        ]
        Make sure the correct answer exactly matches one of the options.
        """
        
        response = self.llm.invoke(prompt + self.transcript)
        try:
            # Parse the response as JSON to avoid syntax errors with eval()
            quiz = json.loads(response)
        except json.JSONDecodeError as e:
            logging.error(f"JSON decode error: {str(e)}")
            quiz = []

        return quiz
