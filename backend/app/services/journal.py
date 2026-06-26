import json
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from app.schemas.journal import LogLine, JournalFilter, LogResponse
from app.services.utils import run_system_command, is_command_available

logger = logging.getLogger("fedora_control_center")

MOCK_LOG_ENTRIES = [
    {"service": "sshd.service", "message": "Accepted publickey for fedora from 192.168.1.50 port 49210 ssh2: RSA SHA256:...", "priority": 6},
    {"service": "sshd.service", "message": "Connection closed by authenticating user root 192.168.1.100 port 38245 [preauth]", "priority": 4},
    {"service": "firewalld.service", "message": "REJECT: hp-ipp: IN=enp3s0 OUT= MAC=... SRC=192.168.1.254 DST=224.0.0.251 PROTO=UDP", "priority": 5},
    {"service": "dnf.service", "message": "Transaction starting for update: curl-8.7.1-2.fc40.x86_64, libcurl-8.7.1-2.fc40.x86_64", "priority": 6},
    {"service": "dnf.service", "message": "Transaction completed successfully.", "priority": 6},
    {"service": "kernel", "message": "ext4: Mounted filesystem with ordered data mode. Opts: (null). Quota mode: none.", "priority": 6},
    {"service": "ollama.service", "message": "Initializing Ollama server on http://127.0.0.1:11434", "priority": 6},
    {"service": "ollama.service", "message": "Loaded model llama3.1:latest (8B parameters, Q4_K_M)", "priority": 6},
    {"service": "systemd", "message": "Started Fedora Control Center Admin Dashboard.", "priority": 6},
    {"service": "auditd", "message": "AUDIT: ID=162547 user=root action=service_start status=success detail=sshd.service", "priority": 5}
]

class JournalService:
    @classmethod
    def is_journalctl_available(cls) -> bool:
        from app.services.utils import force_mock_active
        return is_command_available("journalctl") and not force_mock_active()

    @classmethod
    def get_logs(cls, filters: JournalFilter) -> LogResponse:
        if not cls.is_journalctl_available():
            logger.info("journalctl not available. Generating mock log entries.")
            return cls._get_mock_logs(filters)

        # Build journalctl command
        # Format output as JSON to get reliable structured logs
        cmd = ["journalctl", "--output=json", "--utc", "-n", str(filters.limit), "--no-pager"]
        
        if filters.service:
            # Secure parameter verification: must be alphanumeric or contain standard service chars
            if filters.service.replace(".", "").replace("-", "").replace("@", "").isalnum():
                cmd.extend(["-u", filters.service])
                
        if filters.priority is not None:
            cmd.extend(["-p", str(filters.priority)])
            
        if filters.since:
            # Validate format briefly
            if filters.since.startswith("-") or ":" in filters.since or "-" in filters.since:
                cmd.extend(["--since", filters.since])

        if filters.search:
            # journalctl -g uses regular expression or simple match
            cmd.extend(["-g", filters.search])

        code, stdout, stderr = run_system_command(cmd, timeout=8.0)
        
        if code != 0:
            logger.error(f"journalctl failed: {stderr or stdout}")
            return cls._get_mock_logs(filters)

        lines = []
        for line in stdout.strip().split("\n"):
            if not line:
                continue
            try:
                data = json.loads(line)
                
                # Convert timestamp from microseconds since epoch
                ts_us = int(data.get("__REALTIME_TIMESTAMP", 0))
                ts_str = datetime.fromtimestamp(ts_us / 1000000, tz=timezone.utc).isoformat() if ts_us else "Unknown"

                # Identify process/service
                proc = data.get("_SYSTEMD_UNIT", data.get("SYSLOG_IDENTIFIER", data.get("_COMM", "system")))
                
                lines.append(
                    LogLine(
                        timestamp=ts_str,
                        hostname=data.get("_HOSTNAME", "fedora"),
                        process=proc,
                        pid=data.get("_PID"),
                        message=data.get("MESSAGE", ""),
                        priority=int(data.get("PRIORITY", 6))
                    )
                )
            except Exception as e:
                # Skip invalid lines
                continue

        # Reverse to show newest logs first (journalctl output is chronological, but we might want newer first depending on UX)
        # We will keep the chronological ordering but allow frontend to handle sorting, or sort here.
        # Since we retrieved the last 'limit' lines, they are the newest.
        return LogResponse(lines=lines, count=len(lines))

    @classmethod
    def _get_mock_logs(cls, filters: JournalFilter) -> LogResponse:
        lines = []
        now = datetime.now(timezone.utc)
        
        # Populate mock logs
        count = 0
        for i in range(filters.limit):
            mock_ref = MOCK_LOG_ENTRIES[i % len(MOCK_LOG_ENTRIES)]
            
            # Apply filters
            if filters.service and filters.service.lower() not in mock_ref["service"].lower():
                continue
            if filters.priority is not None and mock_ref["priority"] > filters.priority:
                continue
            if filters.search and filters.search.lower() not in mock_ref["message"].lower():
                continue
                
            time_offset = timedelta(minutes=i * 2)
            log_time = (now - time_offset).isoformat()
            
            lines.append(
                LogLine(
                    timestamp=log_time,
                    hostname="fedora-control-center-host",
                    process=mock_ref["service"],
                    pid=str(2000 + i),
                    message=mock_ref["message"],
                    priority=mock_ref["priority"]
                )
            )
            count += 1
            
        return LogResponse(lines=lines, count=count)
