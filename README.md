# TaskFlow Pro : Dependency-Aware DAG Kanban Engine

A full-stack workflow automation board that models task execution constraints as a Directed Acyclic Graph (DAG), preventing premature task execution and propagating date schedules across dependencies.

## Key Features
- **DAG-Gated Workflow**: Tasks remain in `BLOCKED` status until all explicit upstream predecessor tasks transition to `DONE`.
- **Cycle Detection**: Prevents recursive dependencies via Depth-First Search cycle validation before commit.
- **Topological Schedule Propagation**: Shifts downstream dates dynamically without compounding diamond-dependency delays.
- **Reactive Rollback**: Reverting a completed predecessor automatically pulls downstream dependent tasks back to `BLOCKED`.
- **AI Graph Suggestions**: Recommends missing dependencies with architectural rationales.

##  Tech Stack
- **Backend**: FastAPI, NetworkX, Pydantic v2, PyTest
- **Frontend**: Next.js (App Router), Tailwind CSS, `@hello-pangea/dnd`, Lucide Icons

## Setup & Installation

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

## Frontend
```bash
cd frontend
npm install
npm run dev

### Running Tests
Bash
cd backend
python -m pytest

Commit & push:
```powershell
git add README.md
git commit -m "docs: add architecture documentation and setup guide"
git push
