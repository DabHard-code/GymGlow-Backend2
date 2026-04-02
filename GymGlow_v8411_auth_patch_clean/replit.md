# GymGlow - AI-Powered Movement Form Analyzer

## Overview
GymGlow is a **mobile-first** multi-athlete, multi-sport platform that helps users improve their exercise form through AI-powered video analysis. Designed for phone usage, users can manage multiple athletes, each with their own sport profiles, and receive instant, personalized coaching feedback.

## Recent Changes
- **January 2025**: First-Run User Experience
  - Onboarding carousel: 3-step guided intro (Welcome, Create Profile, Start Using)
  - Welcome Challenge card: Encourages first actions to earn "Rising Star" badge
  - Feedback/Bug Report dialog: Users can submit bugs, feature requests, or questions
  - Version display: "GymGlow v1.0" shown in footer with "More features coming" message
  - Drills page syncs with weekly challenges: Shows "This Week's Challenge Drills" featured section
  - All first-run state stored in localStorage for persistence
- **January 2025**: Meet Scores Tracking
  - Competition history tracking for athletes: Seasons -> Meets -> Scores
  - Sport-specific scoring categories:
    - Gymnastics: Vault, Bars, Beam, Floor, All-Around
    - Dance: Jazz, Hip-Hop, Contemporary, Lyrical, Ballet, Tap, Acro, Musical Theatre, Modern, Open Category
    - Cheer: Stunts, Pyramids, Tumbling, Jumps, Dance, Building/Transitions, Routine Execution, Performance/Showmanship
  - Season management with year and sport tracking
  - Meet details with date, location, and score/placement recording
  - Accordion-based UI for organizing seasons and meets
  - Endpoints: GET/POST /api/athletes/:id/seasons, GET/PATCH/DELETE /api/seasons/:id, GET/POST /api/seasons/:id/meets, GET/PATCH/DELETE /api/meets/:id, GET/POST /api/meets/:id/scores
  - Navigation via "Meet Scores" button in athlete cards
- **January 2025**: Enhanced In-Depth AI Analysis
  - Comprehensive sport-specific coaching prompts for all 5 sports (gymnastics, dance, cheer, lifting, yoga)
  - Phase-by-phase movement analysis (preparation, execution, transition, finish)
  - Body-part specific feedback (head, shoulders, arms, core, hips, legs, feet)
  - Drill recommendations for each improvement area
  - Technical breakdown explaining biomechanics and technique
  - Safety notes for injury prevention
  - Progression tips for advancing to the next level
  - Enhanced feedback panel UI with collapsible sections
  - New fields: technicalBreakdown, safetyNotes, progressionTips, bodyPart, drillRecommendation, phase
- **December 2024**: Skills Library
  - Pre-seeded catalog of 70+ skills across 5 sports (gymnastics, dance, cheer, lifting, yoga)
  - Skills organized by sport and level (levels 3-10)
  - Athlete progress tracking with status: Working On, Consistent, Needs Help
  - Notes field for each athlete-skill combination
  - Skills Library page with sport tabs and level filtering
  - Athlete selector to track progress per athlete
  - Endpoints: GET /api/skills, GET /api/skills/:id, GET /api/athletes/:id/skills, POST /api/athletes/:id/skills
  - Navigation via "Skills" button in home page header
- **December 2024**: Added Cheer Sport
  - Fifth sport type added: cheer (alongside gymnastics, dance, lifting, yoga)
  - Sport icons and labels updated across all pages
- **December 2024**: Weekly Challenge Mode
  - Gamified weekly challenges for each sport with leaderboards
  - Challenge database schema: challenges table (name, sport, difficulty, description, instructions, dates, isActive)
  - Submissions table linking athletes, profiles, and scored video analyses
  - Pre-seeded 4 challenges (one per sport) rotating weekly
  - Challenge page with sport tabs, active challenge cards, and real-time leaderboards
  - Video submission flow with AI scoring
  - Endpoints: GET /api/challenges?active=true, GET /api/challenges/:id/leaderboard, POST /api/challenges/:id/submit
  - Navigation via "Challenges" button in home page header
- **December 2024**: Drill Library
  - 16 pre-seeded drills across all 4 sports (4 per sport)
  - Each drill includes: name, description, how-to-perform instructions, reps/sets, purpose, difficulty level, category
  - Difficulty levels: Beginner, Intermediate, Advanced, Elite
  - Filterable by sport with tabbed navigation
  - Drill detail dialog showing full instructions and purpose
  - Accessible from home page header via "Drills" button
  - Endpoints: GET /api/drills, GET /api/drills/:id (with ?sport= and ?difficulty= filters)
- **December 2024**: Kid-Friendly Badge System
  - 10 badge types: Perfect Lines, Strong Core, Amazing Balance, Flexibility Star, Glow Up, Power Move, Graceful Flow, Precision Master, Endurance Champ, Rising Star
  - AI automatically awards badges based on analysis performance
  - Badge display in athlete cards on home page
  - Badge display in feedback panel after analysis
  - Endpoints: GET /api/athletes/:id/badges, GET /api/analyses/:id/badges
- **December 2024**: Video Upload Performance Optimization
  - Async analysis with polling: POST /api/profiles/:id/analyze returns immediately with sessionId
  - Backend trims videos to first 8 seconds, downscales to 480p
  - Extracts 3-5 key frames at compressed JPEG quality
  - Sends up to 3 frames to OpenAI with low detail setting for faster analysis
  - Session status tracking (uploading, processing, analyzing, ready, error)
  - Frontend polling UI with progress indicators and step-by-step visualization
  - New endpoints: GET /api/sessions/:id, GET /api/sessions/:id/analysis
- **December 2024**: Sport-specific level systems
  - Gymnastics: USAG developmental levels (Level 1-10) and Xcel program (Bronze/Silver/Gold/Platinum/Diamond)
  - Dance: Style-based profiles (Ballet, Jazz, Contemporary, etc.) with skill levels (Beginner through Professional)
  - Weightlifting & Yoga: Standard progression (Beginner, Intermediate, Advanced, Elite)
  - Profile level editing with sport-specific dialogs
  - getLevelDisplayForSport() helper for formatting level display
- **December 2024**: Multi-sport restructure
  - New data model: Users -> Athletes -> Sport Profiles -> Sessions -> Analyses
  - Support for 4 sports: Gymnastics, Dance, Weightlifting, Yoga
  - Athlete management with add/edit/delete functionality
  - Profile-based video analysis with history tracking
  - Recent analyses display per sport profile
  - Rebranded to GymGlow

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI, Wouter (routing)
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM (persistent storage)
- **AI**: OpenAI GPT-5 Vision API
- **Video Processing**: FFmpeg via fluent-ffmpeg
- **State Management**: TanStack Query

## Data Model
```
User (demo-user for now)
  └── Athletes (name, avatarUrl)
       ├── Earned Badges (badgeType, analysisId)
       ├── Skill Progress (skillId, status, notes)
       ├── Seasons (name, year, sport)
       │    └── Meets (name, date, location)
       │         └── Meet Scores (category, score, placement)
       └── Sport Profiles (sport, level)
            └── Sessions (video metadata)
                 └── Analyses (score, feedback, strengths)

Skills (pre-seeded catalog)
  - id, name, sport, level, category
```

## Project Structure
```
client/
├── src/
│   ├── components/
│   │   ├── ui/              # Shadcn UI components
│   │   ├── theme-provider.tsx
│   │   ├── theme-toggle.tsx
│   │   ├── badge-display.tsx    # Badge icons and collection displays
│   │   ├── exercise-type-selector.tsx
│   │   ├── video-upload-zone.tsx
│   │   ├── video-player.tsx
│   │   ├── feedback-panel.tsx
│   │   └── analysis-view.tsx
│   ├── pages/
│   │   ├── home.tsx         # Athlete list with sport profiles
│   │   ├── profile.tsx      # Sport profile detail with analyses
│   │   ├── drills.tsx       # Drill library with filterable cards
│   │   ├── challenges.tsx   # Weekly challenges with leaderboards
│   │   ├── skills.tsx       # Skills library with progress tracking
│   │   └── meet-scores.tsx  # Competition score tracking
│   ├── App.tsx
│   └── index.css
server/
├── index.ts              # Express server setup
├── routes.ts             # API endpoints for athletes, profiles, analyses
├── openai.ts             # OpenAI integration & frame extraction
└── storage.ts            # In-memory storage with demo data
shared/
└── schema.ts             # Data types, Zod schemas, sport definitions
```

## API Endpoints
- `GET /api/athletes` - List all athletes for the demo user
- `POST /api/athletes` - Create a new athlete
- `GET /api/athletes/:id` - Get athlete by ID
- `PATCH /api/athletes/:id` - Update athlete
- `DELETE /api/athletes/:id` - Delete athlete
- `GET /api/athletes/:athleteId/profiles` - Get sport profiles for an athlete
- `GET /api/profiles/:id` - Get profile by ID
- `POST /api/profiles` - Create a new sport profile
- `PATCH /api/profiles/:id` - Update profile
- `DELETE /api/profiles/:id` - Delete profile
- `GET /api/profiles/:profileId/analyses` - Get recent analyses for a profile
- `POST /api/profiles/:profileId/analyze` - Analyze a video for a profile
- `GET /api/analyses/:id` - Get analysis by ID
- `GET /api/drills` - List all drills (supports ?sport= and ?difficulty= filters)
- `GET /api/drills/:id` - Get drill by ID
- `GET /api/skills` - List all skills (supports ?sport= and ?level= filters)
- `GET /api/skills/:id` - Get skill by ID
- `GET /api/athletes/:id/skills` - Get skill progress for an athlete
- `POST /api/athletes/:id/skills` - Update skill progress for an athlete

## Environment Variables
- `OPENAI_API_KEY` (required) - OpenAI API key for GPT-5 vision analysis

## Running the App
The application runs on port 5000 using `npm run dev`.

## Supported Sports & Level Systems
1. **Gymnastics** - USAG Levels 1-10, Xcel Bronze/Silver/Gold/Platinum/Diamond
2. **Dance** - 10 styles (Ballet, Jazz, Contemporary, Modern, Hip-Hop, Tap, Lyrical, Acro, Musical Theater, Ballroom) with 5 skill levels (Beginner, Intermediate, Advanced, Pre-Professional, Professional)
3. **Cheer** - Standard levels (Beginner, Intermediate, Advanced, Elite)
4. **Weightlifting** - Standard levels (Beginner, Intermediate, Advanced, Elite)
5. **Yoga** - Standard levels (Beginner, Intermediate, Advanced, Elite)

## Key Features
1. **Multi-Athlete Support**: Manage multiple athletes (e.g., family members, clients)
2. **Sport Profiles**: Each athlete can have multiple sport profiles with skill levels
3. **Video Upload**: Drag-and-drop or browse (MP4, WebM, MOV up to 100MB)
4. **AI Analysis**: GPT-5 vision model analyzes extracted video frames
5. **Analysis History**: View recent analyses per sport profile
6. **Detailed Feedback**: Overall score, strengths, and specific improvement tips
7. **Video Playback**: Custom player with full controls
8. **Dark Mode**: Full dark/light theme support
9. **Drill Library**: Browse 16 sport-specific drills with detailed instructions and filtering
10. **Weekly Challenges**: Compete in sport-specific challenges with leaderboards and AI scoring
11. **Skills Library**: Track 70+ skills across 5 sports with progress status (Working On, Consistent, Needs Help) and notes per athlete
