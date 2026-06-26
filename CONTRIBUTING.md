# Contributing to Fedora Control Center

Thank you for your interest in contributing to Fedora Control Center! We welcome contributions from everyone—whether you're fixing a typo, refactoring backend APIs, improving accessibility, or building a brand new dashboard view.

Following these guidelines helps ensure a smooth contribution process for you and the maintainers.

---

## 1. Getting Started

### Prerequisites
Make sure your local machine has the required system packages. On Fedora Workstation/Server:
```bash
sudo dnf install -y python3.13 python3-pip python3-devel nodejs npm systemd-devel firewalld
```

### Setup Fork & Clone
1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone git@github.com:your-username/fedora-control-center.git
   cd fedora-control-center
   ```
3. Set the upstream remote:
   ```bash
   git remote add upstream git@github.com:rholalkere/fedora-control-center.git
   ```

---

## 2. Local Development Setup

The project is split into a **FastAPI backend** and a **React frontend**.

### Backend Setup
1. Create a Python virtual environment and activate it:
   ```bash
   python3 -m venv backend/venv
   source backend/venv/bin/pipe/activate   # or bin/activate
   ```
2. Upgrade pip and install dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r backend/requirements.txt
   ```
3. Run the FastAPI development server:
   ```bash
   # From the project root
   make run-backend
   # Or directly
   cd backend
   venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *The backend documentation will be accessible at `http://localhost:8000/docs`.*

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   # From the project root
   make run-frontend
   # Or directly
   cd frontend
   npm run dev
   ```
   *The development UI console will be accessible at `http://localhost:5173`.*

---

## 3. Coding Guidelines & Quality Standards

To maintain a clean codebase, we enforce strict linting and styling configurations on every pull request.

### Backend (Python)
* Follow **PEP 8** style guidelines.
* Format code using `black` and run static analysis using `flake8`.
* Keep service logic inside `app/services/` and database interactions inside `app/repositories/`. Expose endpoints through Pydantic schemas in `app/schemas/`.

### Frontend (React/TypeScript)
* Write clean, type-safe TypeScript files using functional components.
* Format code using Prettier and run the linter:
  ```bash
  cd frontend
  npm run lint
  ```
* Perform a TypeScript build check before committing:
  ```bash
  cd frontend
  npx tsc --noEmit
  ```

---

## 4. Submitting a Pull Request (PR)

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Write clean code, commit your changes, and write descriptive commit messages (following [Conventional Commits](https://www.conventionalcommits.org/)):
   ```bash
   git commit -m "feat: add network routing details dashboard view"
   ```
3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
4. Open a Pull Request from your branch to `main` on the original repository.
5. In your PR description, explain:
   - What changes were made and why.
   - Any new API endpoints added (ensure [API.md](API.md) is updated).
   - Verification steps showing how you tested the code.

---

## 5. Community Code of Conduct
Please note that this project is released with a Contributor Code of Conduct. By participating in this project, you agree to abide by its terms. Let's make this community a welcoming, secure, and productive environment for all!
