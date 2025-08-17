# 0G-AvatarNFT

AI-powered NFT avatar creation platform with GPT integration.

## Features

- **AI Avatar Generation**: Create unique personas using GPT-3.5-turbo
- **Image Upload**: Support for PNG, JPG, JPEG, WebP, and SVG formats (max 5MB)
- **Dual Input Methods**: From URL or direct text description
- **Real-time Preview**: See generated persona details before minting
- **Responsive Design**: Mobile-first approach with desktop optimization

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd 0g-nft
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
# Copy the example file
cp env.example .env

# Edit .env and add your OpenAI API key
OPENAI_API_KEY=sk-your-actual-api-key-here
```

4. Start development server
```bash
npm run dev
```

## Usage

### Generate AI Persona

1. Navigate to `/explore` page
2. Upload an avatar image (optional)
3. Choose input method:
   - **From URL**: Paste a URL containing character information
   - **From Text**: Write a description of your desired character
4. Click "Generate" button
5. Wait for GPT to process and return persona details
6. Review the generated:
   - Name
   - Tagline
   - Tags (3-6 keywords)
   - Long description (background, personality, story)

### API Endpoint

The persona generation uses a custom Vite dev server middleware:

- **POST** `/api/persona/generate`
- **Body**: `{ text: string, url?: string, imageUrl?: string }`
- **Response**: `{ persona: Persona, draftId: string }`

## Development

### Project Structure

```
src/
├── components/
│   └── AvatarDropzone.jsx    # Image upload component
├── types/
│   └── persona.ts            # TypeScript interfaces
├── App.jsx                   # Main app with routing
├── Explore.jsx               # Persona generation page
├── template.jsx              # Homepage template
└── main.jsx                  # App entry point
```

### Key Components

- **AvatarDropzone**: Handles drag & drop image uploads with validation
- **Explore**: Main persona generation interface with left/right pane layout
- **Vite Middleware**: Custom API endpoint for GPT integration

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key for GPT-3.5-turbo access

## Building

```bash
# Development build
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Technologies

- **Frontend**: React 19, Vite
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-3.5-turbo
- **Routing**: React Router DOM
- **Development**: Vite dev server with custom middleware

## License

[Your License Here]
