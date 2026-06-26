# Installing Fedora Control Center

This guide outlines native and containerized installation procedures for Fedora Control Center on Fedora Workstation and Fedora Server.

## Prerequisites

Ensure your system has the required packages:

```bash
sudo dnf install -y python3.13 python3-pip python3-devel nodejs npm systemd-devel firewalld lm-sensors smartmontools
```

## Option 1: Native Host Installation

Running the dashboard directly on the host machine gives it full native access to `systemctl`, `journalctl`, `dnf`, `firewall-cmd`, and `setenforce`.

### 1. Clone & Set Up Directory

```bash
git clone https://github.com/yourusername/fedora-control-center.git /opt/fedora-control-center
cd /opt/fedora-control-center
```

### 2. Configure Backend Service

Create a Python virtual environment and install packages:

```bash
python3.13 -m venv backend/venv
backend/venv/bin/pip install --upgrade pip
backend/venv/bin/pip install -r backend/requirements.txt
```

### 3. Build React Frontend

Install modules and compile static production files:

```bash
cd frontend
npm install --legacy-peer-deps
npm run build
```

We will serve the compiled files using a static server or proxy. For simple native setups, the FastAPI app can serve the frontend static files directly. We can configure Nginx on the host to route traffic:

```bash
sudo dnf install -y nginx
```

Create `/etc/nginx/default.d/fcc.conf`:

```nginx
server {
    listen 80;
    server_name fcc.local;

    location / {
        root /opt/fedora-control-center/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### 4. Polkit Privilege Configuration

To allow the dashboard runner (e.g., a dedicated system user `fcc`) to control systemd services and firewall settings without prompting for sudo password, add a Polkit policy rule.

Create `/etc/polkit-1/rules.d/50-fcc.rules`:

```javascript
polkit.addRule(function(action, subject) {
    if ((action.id == "org.freedesktop.systemd1.manage-units" ||
         action.id == "org.fedoraproject.FirewallD1.config") &&
        subject.isInGroup("fcc")) {
        return polkit.Result.YES;
    }
});
```

Create the user and add to the group:

```bash
sudo useradd -r -s /sbin/nologin fcc
sudo groupadd fcc
sudo usermod -aG fcc fcc
```

### 5. Systemd Service Configuration

To run the backend as a background service, create `/etc/systemd/system/fcc-backend.service`:

```ini
[Unit]
Description=Fedora Control Center Backend
After=network.target

[Service]
Type=simple
User=fcc
WorkingDirectory=/opt/fedora-control-center/backend
ExecStart=/opt/fedora-control-center/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=on-failure
Environment=SECRET_KEY=yoursecretkeyhere

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now fcc-backend
sudo systemctl restart nginx
```

---

## Option 2: Docker / Podman Compose (Containerized)

If running in containers, the dashboard defaults to mock implementations for system actions unless the host's system socket and configuration directories are mounted into the container.

Run:

```bash
# Build and boot
docker compose up -d
```

Access the panel at `http://localhost`.
