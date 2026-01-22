# PaperLoom

Weave your research together. A full-stack web application for PDF and HTML document annotation with a spatial canvas-based relationship mapping system. Integrates with Zotero for managing academic papers and research documents.

## Features

- **Document Viewing**: View PDFs and HTML snapshots from your Zotero library
- **Text Snippets**: Select text from documents and place them on an infinite canvas
- **Visual Capture**: Capture image regions from PDFs and HTML pages
- **Relationship Mapping**: Connect snippets with labeled edges to map relationships
- **AI-Powered Analysis**: Chat with your documents using RAG (Retrieval-Augmented Generation)
- **Post-it Notes**: Add notes to your canvas with 5 color options
- **Auto-Layout**: Automatically arrange nodes using hierarchical or radial layouts
- **Project Management**: Save and load multiple annotation projects

## Prerequisites

- **Python 3.10+** (for backend)
- **Node.js 20+** (for frontend)
- **Zotero Account** with API access ([Get API key](https://www.zotero.org/settings/keys))
- **Ollama** (optional, for local LLM) or **OpenAI API key**

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/paperloom.git
cd paperloom
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file from template
cp .env.example .env
```

Edit `backend/.env` and fill in your Zotero credentials:

```bash
# Get these from: https://www.zotero.org/settings/keys
ZOTERO_USER_ID=your_user_id_here
ZOTERO_API_KEY=your_api_key_here
```

Start the backend server:

```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# (Optional) Create environment file if using non-default backend URL
cp .env.example .env

# Start development server
npm run dev
```

### 4. Open the App

Navigate to **http://localhost:5173** in your browser.

## Configuration

### Backend Environment Variables (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database path | `sqlite:///./paperloom.db` |
| `PROJECTS_DIR` | Directory for saved projects | `./projects` |
| `CACHE_DIR` | Cache for downloaded attachments | `./cache` |
| `ZOTERO_USER_ID` | Your Zotero user ID | **(required)** |
| `ZOTERO_API_KEY` | Your Zotero API key | **(required)** |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:5173,...` |
| `OPENAI_API_KEY` | OpenAI API key (if using OpenAI) | *(optional)* |

### Frontend Environment Variables (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:8000` |

## Getting Zotero Credentials

1. Log in to [Zotero](https://www.zotero.org/)
2. Go to **Settings** > **Feeds/API**
3. Your **User ID** is displayed at the top of the page
4. Click **Create new private key**
5. Give it a name and grant **read access** to your library
6. Copy the generated API key

## Using AI Features

### Option A: Ollama (Local, Free)

1. Install [Ollama](https://ollama.ai/)
2. Pull a model: `ollama pull llama3.2`
3. Ollama runs automatically on `http://localhost:11434`
4. In the app, go to **Settings** and select "Ollama" as the provider

### Option B: OpenAI

1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Add to `backend/.env`: `OPENAI_API_KEY=sk-...`
3. In the app, go to **Settings** and select "OpenAI" as the provider

## Project Structure

```
paperloom/
├── backend/                 # Python FastAPI server
│   ├── main.py             # API endpoints
│   ├── routers/            # Route modules (chat, settings)
│   ├── services/           # Business logic (zotero, llm, vector store)
│   ├── models.py           # Database models
│   └── .env.example        # Environment template
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Route pages
│   │   ├── store/          # Zustand state management
│   │   └── api.ts          # Backend API client
│   └── .env.example        # Environment template
└── README.md               # This file
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save project |
| `Ctrl+/` | Toggle AI chat sidebar |
| `F` | Toggle focus mode (expand document viewer) |
| `Escape` | Close panels |
| `Ctrl+Shift+S` | Toggle staging area |

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, ReactFlow, Zustand
- **Backend**: Python, FastAPI, SQLModel, ChromaDB, LangChain
- **AI**: Ollama (local) or OpenAI API

## Troubleshooting

### "Zotero API not configured"
Make sure `ZOTERO_USER_ID` and `ZOTERO_API_KEY` are set in `backend/.env`

### "Failed to fetch files"
1. Check that the backend is running on port 8000
2. Verify your Zotero credentials are correct
3. Run "Sync Library" from the Library page

### CORS errors
If running frontend on a non-standard port, add it to `CORS_ORIGINS` in `backend/.env`

### AI chat not working
1. For Ollama: Ensure Ollama is running (`ollama serve`)
2. For OpenAI: Check that `OPENAI_API_KEY` is set in `backend/.env`
3. Go to Settings in the app and test the connection

## License

MIT
