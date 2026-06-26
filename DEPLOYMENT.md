# Deploying Fedora Control Center in Production

This guide covers deployment strategies for hosting Fedora Control Center securely in a production environment.

## 1. Security Invariants

### HTTPS & TLS Enforcement
Never expose the Fedora Control Center over plain HTTP. Deploy an Nginx reverse proxy with TLS certificates.

To generate free SSL certificates using Let's Encrypt:

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d controlcenter.yourdomain.com
```

### JWT Secret Key Rotation
Always rotate the JWT secret token in production. Avoid using the default key. Set it in systemd or docker-compose environment variables:

```bash
# Generate a secure key
openssl rand -hex 32
```

### Minimize Host Exposure
- Only open ports `80` and `443` on the public zone.
- Access the admin backend router `/docs` only via internal networks or VPN tunnels.

---

## 2. Upgrading to PostgreSQL

To support high-concurrency logging and large audit trails, migrate the database backend from SQLite to PostgreSQL.

### 1. Provision a PostgreSQL Database

On Fedora:

```bash
sudo dnf install -y postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
```

Create database and user:

```bash
sudo -i -u postgres psql -c "CREATE DATABASE fcc;"
sudo -i -u postgres psql -c "CREATE USER fccuser WITH PASSWORD 'securepassword';"
sudo -i -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fcc TO fccuser;"
```

### 2. Update Connection URI

Set the connection string in the environment configurations:

```env
SQLALCHEMY_DATABASE_URI=postgresql://fccuser:securepassword@localhost:5432/fcc
```

FastAPI will automatically boot using the PostgreSQL connection pools.

---

## 3. Production Backups

To back up database tables and logs, set up a cron task.

For SQLite:
```bash
sqlite3 /opt/fedora-control-center/backend/fedora_control_center.db ".backup '/var/backups/fcc_backup.db'"
```

For PostgreSQL:
```bash
pg_dump -U fccuser -h localhost fcc > /var/backups/fcc_backup.sql
```
