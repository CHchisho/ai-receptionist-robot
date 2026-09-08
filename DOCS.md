Requirements Specification
Course: Mediapalveluprojekti
Project: AI Receptionist Robot
Group: MAP25-R2
Version: 0.1
Date: 07.09.2026

1. Introduction
   Nokia Espoo Innovation Garage is a space for demonstrations, workshops and events. It has limited signage, and information about Nokia, the Garage and the Veturi programs is scattered across different sources. A human receptionist is not always available.
   This project designs and implements an AI-powered receptionist ("Lena") that talks with visitors by voice, answers questions from approved knowledge sources, and gives basic indoor navigation help.
   Initially the solution is a tablet-based application.
   This document will be updated as the project progresses.

2. Goal
   Develop a functional AI receptionist that:
   welcomes visitors and introduces itself and the location;
   answers questions about Nokia, Nokia Innovation Garage and Nokia Veturi programs;
   answers general questions based on approved documents/URLs (RAG);
   gives basic indoor navigation help;
   communicates by voice, with supporting on-screen info and QR codes for links;
   runs entirely on local infrastructure, so confidential information never leaves the local network.

3. Target Users
   User
   Needs
   Visitors (guests, employees, workshop/event participants)
   Understand the location, learn about Nokia/demos/projects, find rooms
   Content owner
   Add/remove/update documents and approved URLs without touching source code
   Workshop/event participants
   Event-, schedule- and facility-related information (to be detailed via user research)

4. Scope
   In scope: tablet app; voice interaction (local STT/TTS); local LLM with RAG over a local knowledge base (documents + approved URLs); welcome flow; Nokia/Garage/Veturi info; basic indoor navigation; QR codes for links; local deployment.
   Out of scope (for now): facial recognition or visitor identification; unrestricted internet access for the AI; physical robot design/build.

5. Minimum Viable Product
   Tablet UI with voice input/output (local STT/TTS) → local LLM answers questions using a local knowledge base built from approved documents and URLs → covers welcome interaction, basic Nokia/Garage/Veturi info, basic navigation, and QR-code generation for relevant links. All running on local infrastructure.

6. Use Cases
   Welcome – Lena greets the visitor and invites voice questions.
   General/Nokia/Garage/Veturi question – visitor asks (e.g. "What is this place?", "What is Nokia?", "What is the Veturi program?"); system retrieves relevant context and answers by speech.
   Demonstration/project question – e.g. "What is this smart light pole?" — answered from the knowledge base if available.
   Navigation – e.g. "Where is the meeting room?" — directions based on verified location data and landmarks (e.g. "opposite the restroom").
   Link sharing – when an answer references a URL, the app shows a QR code the visitor can scan.
   Knowledge management – content owner adds/removes a document or approved URL; system reprocesses it and makes it available for future answers.

7. Key User Stories
   As a visitor, I want to talk to Lena by voice, get an explanation of the location, ask about Nokia/Garage/demos/projects, get directions inside the building, receive links as QR codes, and (where possible) be answered in my own language.
   As a content owner, I want to add or remove documents/approved URLs and have the knowledge base update automatically, without editing code.

8. Functional Requirements

#

Requirement
FR-01
Tablet-optimized UI
FR-02
Default persona "Lena" (configurable persona = future feature)
FR-03–07
Voice input → local speech-to-text → local LLM response (using retrieved knowledge) → local text-to-speech output
FR-08
Predefined welcome interaction
FR-09–13
Answers about Nokia, Innovation Garage, Veturi programs, general questions, and demos/projects, based on approved sources
FR-14
Basic indoor navigation using stored location data and landmarks
FR-15–16
Knowledge sources: approved documents (PDF priority) and approved URLs only
FR-17–19
Backend fetches approved URLs (no unrestricted AI browsing); content is processed (extract → clean → chunk → embed) and indexed for semantic search
FR-20
QR code generation/display for relevant links
FR-21
Content owner can add, view and remove knowledge sources
FR-22
English is primary; respond in visitor's language when supported
FR-23
If no relevant information is found, say so — never invent an answer

9. Non-Functional Requirements (condensed)

#

Requirement
NFR-01/02/04
All AI processing (STT, LLM, embeddings, vector search, TTS) and all confidential data stay on the local Nokia server/network; nothing confidential goes to external cloud AI
NFR-03
Internet access only for fetching content from approved URLs; no unrestricted AI browsing
NFR-05
Minimize latency between question and start of response (measured during testing)
NFR-06
Simple, training-free usability; voice interaction clearly the primary method
NFR-07
Graceful handling of failed speech recognition, missing information, failed source processing or unreachable URLs — clear feedback, no silent failure
NFR-08
Modular architecture — LLM/STT/TTS components replaceable independently
NFR-09
Reproducible, documented deployment

10. Initial Approved Knowledge Sources
    Nokia - https://en.wikipedia.org/wiki/Nokia
    Nokia Veturi programs - https://www.nokia.com/innovation/veturi-programs/
    Nokia Innovation Garages - https://www.nokia.com/innovate-with-nokia/nokia-garages/
    Oulu Garage - https://www.nokia.com/innovate-with-nokia/nokia-garages/oulu-garage/
    More documents/URLs may be added by the content owner;

11. Knowledge Base Approach (RAG)
    Question → speech-to-text → search local vector knowledge base → retrieve relevant chunks → pass as context to local LLM → generate answer → text-to-speech → play back. The LLM must rely on retrieved context rather than general knowledge for Nokia/Garage-specific questions.
    Indoor navigation data is stored separately in structured form (location, floor, nearby landmarks, directions), not left entirely to the LLM.

12. Proposed Technical Architecture
    Layer
    Technology
    Notes
    Frontend
    React + TypeScript
    Runs as web app on tablet; UI states: Idle, Welcome, Listening, Processing, Speaking, Error
    Backend
    FastAPI (Python)
    Coordinates all services
    App database
    SQLite
    Sufficient for single-server, low-concurrency use; replaceable later
    Vector DB
    Qdrant
    Stores embeddings of documents and approved web pages
    LLM
    Ollama
    Candidate models evaluated during PoC; must use retrieved context and avoid inventing facts
    Speech-to-text
    faster-whisper
    Model size depends on hardware/latency needs
    Text-to-speech
    Piper
    English required; other languages evaluated during PoC
    Deployment
    Docker Compose
    Manages all services; reproducible setup

Knowledge processing pipeline: Document/URL → text extraction → cleaning → chunking → embedding → store in Qdrant (all locally; no arbitrary URL fetching by the LLM itself).

13. Proof of Concept — What Must Be Verified
    Local LLM runs on the provided server and answers using retrieved context.
    faster-whisper handles voice input at acceptable speed.
    Piper produces speech at acceptable quality/speed.
    Qdrant retrieves relevant content from processed documents.
    Documents and approved URLs can be ingested into the knowledge base.
    The full pipeline works end-to-end: Speech → STT → Retrieval → LLM → TTS → Speech.

14. Success Criteria
    The MVP is successful if, on a tablet, a visitor can ask Lena a question by voice and receive a spoken answer generated locally from the knowledge base — including introductions to Nokia, the Innovation Garage and Veturi programs, answers from provided documents/URLs, basic navigation help, and QR codes for relevant links — with all confidential processing kept inside the local network, deployed reproducibly via Docker Compose.

15. Future Development (not in MVP scope)
    Physical robot integration and movement; automatic visitor detection; multiple personas; richer content management; event/workshop-specific interactions; conversation analytics; advanced navigation.

16. Development Priorities
    Technical PoC — local server, LLM, STT, TTS, retrieval
    Knowledge management — document/URL ingestion, embeddings, vector search
    Voice interaction — mic input, recognition, response, speech output
    User interface — tablet UI, Lena's visual representation, interaction states, QR display
    Product features — welcome, Nokia/Garage/Veturi info, navigation
    Testing — technical, latency, usability, knowledge accuracy
