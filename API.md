# Fedora Control Center - API Documentation

The Fedora Control Center API is built on FastAPI and follows REST conventions and JSON schemas. All metrics are streamable in real-time using a secure WebSocket channel.

## Authentication & Headers
Most endpoints require authentication. Include the JWT access token in the headers:
`Authorization: Bearer <your_access_token>`

---

## 1. Authentication Endpoints

### POST `/api/v1/auth/login`
Authenticates user and returns access token.
- **Content-Type**: `application/x-www-form-urlencoded`
- **Body Parameters**:
  - `username`: string
  - `password`: string
- **Response** (200 OK):
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer"
  }
  ```

### GET `/api/v1/auth/me`
Retrieves authenticated user profile.
- **Response** (200 OK):
  ```json
  {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "is_active": true,
    "created_at": "2026-06-11T00:24:01Z"
  }
  ```

### POST `/api/v1/auth/register`
Registers a new system user. Admin only.
- **Response** (200 OK): User details JSON.

---

## 2. System Telemetry Endpoints

### GET `/api/v1/system/metrics`
Collects current snapshot of host CPU, Memory, Disk partitions, Network interfaces, and GPU sensors.
- **Response** (200 OK): `SystemMetrics` schema.

### WS `/api/v1/system/ws/telemetry`
Establishes a WebSocket connection to stream live telemetry metrics.
- **Query Parameters**:
  - `token`: JWT access token.
- **Stream Output**: Emits `SystemMetrics` JSON string every 2 seconds.

---

## 3. Systemd Services Endpoints

### GET `/api/v1/services/`
Lists system services.
- **Query Parameters**:
  - `search`: filter query string.

### POST `/api/v1/services/control`
Triggers service controls. Admin only.
- **Body Schema**:
  ```json
  {
    "name": "sshd.service",
    "action": "restart" // start, stop, restart
  }
  ```

---

## 4. Journalctl Logging Endpoints

### POST `/api/v1/logs/query`
Filters and searches journal entries.
- **Body Schema**:
  ```json
  {
    "service": "sshd",
    "priority": 4,
    "since": "-1h",
    "search": "Accepted",
    "limit": 100
  }
  ```

### GET `/api/v1/logs/export`
Downloads system logs as a raw `.log` text file.

---

## 5. DNF Package Manager Endpoints

### GET `/api/v1/packages/installed`
Lists all installed RPM packages on host.

### GET `/api/v1/packages/updates`
Checks available Fedora updates via DNF.

### POST `/api/v1/packages/install`
Installs packages. Admin only.
- **Body Schema**:
  ```json
  {
    "packages": ["htop", "tmux"]
  }
  ```

---

## 6. Containers (Podman & Docker) Endpoints

### GET `/api/v1/containers/`
Lists all Docker and Podman containers on the host.

### POST `/api/v1/containers/control`
Modifies container state. Admin only.
- **Body Schema**:
  ```json
  {
    "id": "c1b2c3d4e5f6",
    "engine": "podman", // podman, docker
    "action": "start" // start, stop, restart
  }
  ```

### GET `/api/v1/containers/logs/{engine}/{container_id}`
Retrieves log tails for a container.

---

## 7. FirewallD Endpoints

### GET `/api/v1/firewall/zones`
Lists all firewall zones and their active interfaces, open ports, and services.

### POST `/api/v1/firewall/ports`
Opens or closes ports in a firewall zone. Admin only.
- **Query Parameters**:
  - `zone`: target zone name (default: `public`).
  - `action`: `add` or `remove`.
- **Body Schema**:
  ```json
  {
    "port": "8080",
    "protocol": "tcp" // tcp, udp
  }
  ```

---

## 8. SELinux Endpoints

### GET `/api/v1/selinux/status`
Returns SELinux enabled state and mode rules.

### POST `/api/v1/selinux/mode`
Toggles runtime mode. Admin only.
- **Body Schema**:
  ```json
  {
    "mode": "permissive" // enforcing, permissive
  }
  ```

---

## 9. AI Ollama Endpoints

### GET `/api/v1/ai/models`
Lists downloaded Ollama LLM models.

### POST `/api/v1/ai/pull`
Initiates download for a model. Admin only.
- **Body Schema**:
  ```json
  {
    "name": "llama3.1:8b"
  }
  ```

### POST `/api/v1/ai/generate`
Runs prompts on a model.
- **Body Schema**:
  ```json
  {
    "model": "llama3.1:8b",
    "prompt": "How do I check systemctl failed units?"
  }
  ```

---

## 10. Network Management Endpoints

### GET `/api/v1/network/interfaces`
Retrieves a list of all active network interfaces and their configuration.

### GET `/api/v1/network/devices`
Scans neighboring devices connected to local networks.

### GET `/api/v1/network/sockets`
Retrieves a list of active network sockets (`tcp` / `udp` states).

### GET `/api/v1/network/routes`
Retrieves host routing table details.

### GET `/api/v1/network/wifi`
Scans and lists nearby Wi-Fi network SSIDs.

### POST `/api/v1/network/devices/block`
Blocks a device's network access using Firewalld MAC drop rules. Admin only.
- **Body Schema**:
  ```json
  {
    "mac": "00:11:22:33:44:55",
    "ip": "192.168.1.100",
    "hostname": "unauthorized-device",
    "reason": "Intruder"
  }
  ```

### POST `/api/v1/network/devices/unblock`
Unblocks a device's network access. Admin only.
- **Body Schema**:
  ```json
  {
    "mac": "00:11:22:33:44:55"
  }
  ```

### GET `/api/v1/network/devices/blocked`
Lists all currently blocked MAC addresses.

### GET `/api/v1/network/analytics/usage`
Retrieves historical bandwidth logs.
- **Query Parameters**:
  - `range_days`: filter duration in days (default: `7`).

### GET `/api/v1/network/analytics/access-logs`
Lists paginated destination IP access logs.

### GET `/api/v1/network/dns-blocklist`
Lists all system-wide blocked domains.

### POST `/api/v1/network/dns-blocklist/block`
Blocks a domain system-wide. Admin only.
- **Body Schema**:
  ```json
  {
    "domain": "facebook.com",
    "reason": "Prevent distractions"
  }
  ```

### POST `/api/v1/network/dns-blocklist/unblock`
Allows a domain system-wide. Admin only.
- **Body Schema**:
  ```json
  {
    "domain": "facebook.com"
  }
  ```

---

## 11. Performance & Process Control Endpoints

### GET `/api/v1/system/processes`
Lists all running processes on the host sorted by CPU/RAM usage.

### POST `/api/v1/system/processes/kill`
Terminates a process by PID. Admin only.
- **Body Schema**:
  ```json
  {
    "pid": 1234
  }
  ```

### GET `/api/v1/system/power-profile`
Retrieves the active performance profile from `power-profiles-daemon`.

### POST `/api/v1/system/power-profile`
Switches the active system power profile. Admin only.
- **Body Schema**:
  ```json
  {
    "profile": "performance" // performance, balanced, power-saver
  }
  ```

