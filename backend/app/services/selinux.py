import os
import logging
import re
import time
from typing import List
from app.schemas.selinux import SELinuxStatus, SELinuxBoolean, SELinuxDenial
from app.services.utils import run_system_command, is_command_available

logger = logging.getLogger("fedora_control_center")

# Mock SELinux state
MOCK_SELINUX = {
    "enabled": True,
    "current_mode": "Enforcing",
    "config_mode": "Enforcing",
    "policy_type": "targeted"
}

MOCK_BOOLEANS = [
    {"name": "httpd_can_network_connect", "current_value": False, "default_value": False, "description": "Allow HTTPD scripts and modules to connect to the network."},
    {"name": "httpd_enable_homedirs", "current_value": True, "default_value": True, "description": "Allow HTTPD to read home directories."},
    {"name": "container_manage_cgroup", "current_value": True, "default_value": True, "description": "Allow containers to manage cgroups."},
    {"name": "virt_use_nfs", "current_value": False, "default_value": False, "description": "Allow virtual machine images to reside on NFS shares."},
    {"name": "ftpd_is_daemon", "current_value": True, "default_value": True, "description": "Allow ftp daemon to run as a daemon."},
    {"name": "xen_use_nfs", "current_value": False, "default_value": False, "description": "Allow Xen virtual guests to reside on NFS shares."},
    {"name": "logging_syslogd_run_tty", "current_value": True, "default_value": True, "description": "Allow syslogd to run on TTYs."},
    {"name": "ssh_sysadm_login", "current_value": False, "default_value": False, "description": "Allow SSH logins to administrative domains."}
]

MOCK_DENIALS = [
    {
        "timestamp": "2026-06-11 00:15:32",
        "scontext": "system_u:system_r:httpd_t:s0",
        "tcontext": "unconfined_u:object_r:user_home_t:s0",
        "tclass": "file",
        "permission": "read",
        "comm": "nginx",
        "path": "/home/rahul/websites/index.html",
        "resolution": "Run 'chcon -t httpd_sys_content_t /home/rahul/websites/index.html' to assign the correct SELinux context type."
    },
    {
        "timestamp": "2026-06-11 00:42:19",
        "scontext": "system_u:system_r:httpd_t:s0",
        "tcontext": "system_u:object_r:port_t:s0",
        "tclass": "tcp_socket",
        "permission": "name_connect",
        "comm": "httpd",
        "path": "port 8085",
        "resolution": "Enable the 'httpd_can_network_connect' boolean by running 'setsebool -P httpd_can_network_connect on' to allow outbound connections."
    },
    {
        "timestamp": "2026-06-11 01:05:03",
        "scontext": "system_u:system_r:container_t:s0",
        "tcontext": "system_u:object_r:var_log_t:s0",
        "tclass": "dir",
        "permission": "write",
        "comm": "fluentd",
        "path": "/var/log/app",
        "resolution": "Label the host folder with container-share context using 'chcon -Rt svirt_sandbox_file_t /var/log/app'."
    }
]

class SELinuxService:
    @classmethod
    def is_selinux_available(cls) -> bool:
        from app.services.utils import force_mock_active
        if force_mock_active():
            return False
        # Check if sestatus CLI exists or selinuxfs is mounted
        return is_command_available("sestatus") or os.path.exists("/sys/fs/selinux")

    @classmethod
    def get_status(cls) -> SELinuxStatus:
        if not cls.is_selinux_available():
            logger.info("SELinux tools not found. Returning mock status.")
            return SELinuxStatus(
                enabled=MOCK_SELINUX["enabled"],
                current_mode=MOCK_SELINUX["current_mode"],
                config_mode=MOCK_SELINUX["config_mode"],
                policy_type=MOCK_SELINUX["policy_type"]
            )

        code, stdout, _ = run_system_command(["sestatus"], timeout=4.0)
        
        if code != 0:
            # Try parsing directly from sysfs
            if os.path.exists("/sys/fs/selinux/enforce"):
                try:
                    with open("/sys/fs/selinux/enforce", "r") as f:
                        val = f.read().strip()
                        mode = "Enforcing" if val == "1" else "Permissive"
                    return SELinuxStatus(enabled=True, current_mode=mode, config_mode="unknown", policy_type="targeted")
                except Exception:
                    pass
            return SELinuxStatus(enabled=False, current_mode="Disabled", config_mode="Disabled", policy_type="none")

        enabled = False
        current_mode = "Disabled"
        config_mode = "Disabled"
        policy_type = "none"

        for line in stdout.strip().split("\n"):
            if ":" not in line:
                continue
            parts = [p.strip() for p in line.split(":", 1)]
            key = parts[0].lower()
            val = parts[1]

            if "selinux status" in key:
                enabled = (val.lower() == "enabled")
            elif "current mode" in key:
                current_mode = val.capitalize()
            elif "mode from config file" in key:
                config_mode = val.capitalize()
            elif "loaded policy name" in key or "policy from config file" in key:
                policy_type = val

        return SELinuxStatus(
            enabled=enabled,
            current_mode=current_mode,
            config_mode=config_mode,
            policy_type=policy_type
        )

    @classmethod
    def set_mode(cls, mode: str) -> bool:
        mode = mode.lower() # enforcing or permissive
        if mode not in ["enforcing", "permissive"]:
            return False

        if not cls.is_selinux_available():
            # Update mock
            MOCK_SELINUX["current_mode"] = mode.capitalize()
            return True

        val = "1" if mode == "enforcing" else "0"
        code, stdout, stderr = run_system_command(["setenforce", val], timeout=5.0)
        
        if code != 0:
            logger.error(f"Failed to change SELinux mode: {stderr or stdout}")
            return False

        return True

    @classmethod
    def get_booleans(cls) -> List[SELinuxBoolean]:
        if not cls.is_selinux_available():
            return [
                SELinuxBoolean(
                    name=b["name"],
                    current_value=b["current_value"],
                    default_value=b["default_value"],
                    description=b["description"]
                )
                for b in MOCK_BOOLEANS
            ]

        code, stdout, _ = run_system_command(["getsebool", "-a"], timeout=4.0)
        if code != 0:
            return [
                SELinuxBoolean(
                    name=b["name"],
                    current_value=b["current_value"],
                    default_value=b["default_value"],
                    description=b["description"]
                )
                for b in MOCK_BOOLEANS
            ]

        booleans = []
        desc_map = {b["name"]: b["description"] for b in MOCK_BOOLEANS}
        
        for line in stdout.strip().split("\n"):
            if "-->" not in line:
                continue
            parts = [p.strip() for p in line.split("-->", 1)]
            if len(parts) == 2:
                name = parts[0]
                val_str = parts[1].lower()
                val = (val_str == "on" or val_str == "1")
                booleans.append(
                    SELinuxBoolean(
                        name=name,
                        current_value=val,
                        default_value=val,
                        description=desc_map.get(name, f"Control policy parameter for {name}")
                    )
                )
        return booleans

    @classmethod
    def toggle_boolean(cls, name: str, value: bool) -> bool:
        if not cls.is_selinux_available():
            for b in MOCK_BOOLEANS:
                if b["name"] == name:
                    b["current_value"] = value
                    return True
            return False

        val_str = "on" if value else "off"
        code, stdout, stderr = run_system_command(["setsebool", name, val_str], timeout=5.0)
        if code != 0:
            logger.error(f"Failed to toggle SELinux boolean {name}: {stderr or stdout}")
            return False
        return True

    @classmethod
    def get_denials(cls) -> List[SELinuxDenial]:
        if not cls.is_selinux_available():
            return [SELinuxDenial(**d) for d in MOCK_DENIALS]

        code, stdout, _ = run_system_command(["ausearch", "-m", "avc", "-n", "10", "--raw"], timeout=4.0)
        
        if code != 0 or not stdout.strip():
            code, stdout, _ = run_system_command(["journalctl", "_TRANSPORT=audit", "-n", "20", "--no-pager"], timeout=4.0)

        if code != 0 or not stdout.strip():
            return [SELinuxDenial(**d) for d in MOCK_DENIALS]

        denials = []
        avc_regex = re.compile(
            r'denied\s+{(?P<perm>[^}]+)}.*comm="(?P<comm>[^"]+)".*scontext=(?P<scontext>[^\s]+).*tcontext=(?P<tcontext>[^\s]+).*tclass=(?P<tclass>[^\s]+)'
        )
        path_regex = re.compile(r'path="(?P<path>[^"]+)"')
        msg_time_regex = re.compile(r'audit\((?P<sec>\d+)\.(?P<msec>\d+)')

        lines = stdout.strip().split("\n")
        for line in lines:
            if "AVC" not in line and "avc:  denied" not in line:
                continue
            
            match = avc_regex.search(line)
            if not match:
                continue

            groups = match.groupdict()
            
            path_match = path_regex.search(line)
            path = path_match.group("path") if path_match else None
            
            time_str = "Unknown time"
            time_match = msg_time_regex.search(line)
            if time_match:
                try:
                    sec = int(time_match.group("sec"))
                    time_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(sec))
                except Exception:
                    pass

            resolution = "Analyze the denial logs using audit2why or audit2allow to generate policy modules."
            perm = groups["perm"].strip()
            tclass = groups["tclass"]
            if "httpd_t" in groups["scontext"] and "port_t" in groups["tcontext"]:
                resolution = "Enable the 'httpd_can_network_connect' boolean to allow network socket operations."
            elif "user_home_t" in groups["tcontext"]:
                resolution = f"File is in user home. If this is content to be served, label with httpd content type: 'chcon -t httpd_sys_content_t {path or 'file'}'."
            elif "container_t" in groups["scontext"] and tclass == "file":
                resolution = "Docker/Podman volume mount context error. Label directory on host with 'svirt_sandbox_file_t' or mount with ':Z' flag."

            denials.append(
                SELinuxDenial(
                    timestamp=time_str,
                    scontext=groups["scontext"],
                    tcontext=groups["tcontext"],
                    tclass=tclass,
                    permission=perm,
                    comm=groups["comm"],
                    path=path,
                    resolution=resolution
                )
            )

        if not denials:
            return [SELinuxDenial(**d) for d in MOCK_DENIALS]
            
        return denials[:10]

