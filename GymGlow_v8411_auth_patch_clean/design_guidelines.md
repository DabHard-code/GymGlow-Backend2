# AI Fitness Form Analyzer - Design Guidelines

## Design Approach

**Reference-Based Approach**: Drawing from fitness and video platforms:
- **Primary Inspiration**: Peloton (motivational fitness UI), YouTube Studio (video controls), Strava (performance analytics)
- **Design Principles**: Athletic energy meets analytical precision, motivational yet functional, emphasis on video clarity and actionable feedback

## Typography System

**Font Families** (via Google Fonts):
- **Primary**: Inter (UI elements, body text, metrics)
- **Display**: Archivo Black (headlines, exercise names, motivational callouts)

**Type Scale**:
- Hero/Exercise Names: 2xl-4xl, weight 900 (Archivo Black)
- Section Headers: xl-2xl, weight 700 (Inter)
- Body/Feedback: base-lg, weight 400-500 (Inter)
- Captions/Metadata: sm-xs, weight 400 (Inter)

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4, p-6, p-8
- Section spacing: gap-6, gap-8, gap-12
- Margins: m-4, m-6, m-8

**Grid Structure**:
- Desktop: Two-column layout (video 60% / feedback 40%)
- Tablet: Stacked single column, video full-width
- Mobile: Full-width stack with collapsible feedback

**Container Strategy**:
- Main app: max-w-screen-2xl with px-4 to px-8
- Video player: Maintains 16:9 aspect ratio
- Feedback panel: Fixed width on desktop (min-w-96)

## Core Components

### Video Upload Zone
- Large drag-and-drop area (min-h-96 on empty state)
- Dashed border with generous padding (p-12)
- Icon: Large upload icon from Heroicons (h-20 w-20)
- Bold instructional text with file type indicators
- Secondary "Browse Files" button below

### Exercise Type Selector
- Horizontal pill buttons (rounded-full, px-6, py-3)
- Options: Workout | Gymnastics | Golf | Dance
- Active state: Bold weight, solid background
- Icon integration from Heroicons for each type

### Video Player
- Custom controls overlay on hover
- Playback controls: Play/Pause, 0.5x/1x/2x speed, frame-by-frame (±1s buttons)
- Progress bar with timestamp markers for flagged moments
- Fullscreen toggle
- Frame counter display (small, unobtrusive)

### Analysis Feedback Panel
- Scrollable container (max-h-screen - header)
- Header: Exercise type badge + "AI Analysis" title
- Feedback cards with structured sections:
  - **Timestamp badge** (bold, small caps)
  - **Issue title** (lg, weight 600)
  - **Description** (base, weight 400, leading-relaxed)
  - **Improvement tip** (highlighted text treatment)
- Severity indicators: Visual weight through typography only
- Loading state: Skeleton cards with pulse animation

### Header Navigation
- Sticky top bar (h-16)
- Logo/brand mark (left)
- "New Analysis" button (right)
- Upload count badge (if applicable)

### Empty States
- Large illustration placeholder comment (<!-- MOTIVATIONAL ILLUSTRATION -->)
- Bold headline: "Upload Your First Video"
- Subtext with supported formats
- Primary CTA button

## Component Library

**Buttons**:
- Primary: rounded-lg, px-6, py-3, weight 600, text-base
- Secondary: Same dimensions, outlined treatment
- Icon buttons: Square (h-10 w-10), rounded-lg
- All buttons: Implement hover/active states

**Cards**:
- Rounded corners: rounded-xl
- Padding: p-6
- Shadow treatment for elevation
- Border: 1px solid for subtle definition

**Form Inputs** (if needed for settings):
- Height: h-12
- Padding: px-4
- Rounded: rounded-lg
- Focus states with ring treatment

**Icons**: Heroicons via CDN
- Size variants: h-4 w-4 (small), h-6 w-6 (medium), h-8 w-8 (large)
- Stroke width: 2 for consistency

## Images

**No hero image required** - This is a tool-focused application where the uploaded video IS the hero content.

**Placeholder States**:
- Empty video frame: Gradient or pattern background with centered upload icon
- Loading states: Blurred placeholder matching aspect ratio
- Error states: Icon + explanatory text

## Page Structure

### Main Application View (Post-Upload)
1. **Header** (h-16): Logo, New Analysis button
2. **Exercise Selector Bar** (h-20): Pill buttons for activity type
3. **Two-Column Layout**:
   - Left: Video player with custom controls
   - Right: Scrollable feedback panel with analysis cards
4. **Bottom Bar** (optional, h-16): Share, Download Report buttons

### Upload View
1. **Header**: Same as main
2. **Centered Upload Zone**: Large drop area (min-h-96)
3. **Feature Pills Below**: Quick bullets on what AI analyzes (3-4 items, horizontal)
4. **Recent Uploads**: Grid of thumbnail cards (if history exists)

## Interaction Patterns

**Video Interactions**:
- Click feedback card → Jump to timestamp in video
- Hover feedback timestamp → Highlight on video timeline
- Click timeline markers → Open relevant feedback card

**Upload Flow**:
- Drag-and-drop with visual feedback (border pulse)
- Progress bar during upload (0-100%)
- Smooth transition to analysis view

**Responsiveness**:
- Desktop (lg+): Side-by-side video/feedback
- Tablet (md): Stacked, video top, feedback below
- Mobile: Full-width stack, sticky video controls

## Animations

**Minimal, purposeful only**:
- Fade-in for feedback cards as AI generates them (duration-300)
- Smooth scroll to timestamp when clicking feedback
- Upload progress indication
- No parallax, no scroll-triggered effects

## Accessibility

- Video player: Full keyboard navigation
- Feedback cards: ARIA labels for timestamps
- Skip-to-content link
- High contrast text throughout
- Touch targets minimum 44x44px
- Screen reader announcements for AI feedback completion

---

**Design Philosophy**: Athletic confidence meets analytical precision. Bold typography creates energy, generous spacing ensures clarity, and streamlined components keep focus on the video analysis experience.