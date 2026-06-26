import logging
from typing import List, Optional
from app.schemas.package import PackageInfo, UpdateHistoryEntry, PackageActionResponse
from app.services.utils import run_system_command, is_command_available

logger = logging.getLogger("fedora_control_center")

# Mock packages list for containers
MOCK_INSTALLED_PACKAGES = [
    PackageInfo(name="kernel", version="6.8.9", release="300.fc40", architecture="x86_64", repository="@System", summary="The Linux Kernel"),
    PackageInfo(name="dnf", version="4.19.0", release="1.fc40", architecture="noarch", repository="@System", summary="Package manager"),
    PackageInfo(name="systemd", version="255.4", release="4.fc40", architecture="x86_64", repository="@System", summary="System and Service Manager"),
    PackageInfo(name="curl", version="8.6.0", release="7.fc40", architecture="x86_64", repository="@System", summary="Command line tool for transferring data with URLs"),
    PackageInfo(name="openssh-server", version="9.6p1", release="4.fc40", architecture="x86_64", repository="@System", summary="OpenSSH server daemon"),
    PackageInfo(name="firewalld", version="2.1.1", release="1.fc40", architecture="noarch", repository="@System", summary="Dynamically managed firewall with support for IP sets"),
    PackageInfo(name="podman", version="5.0.1", release="1.fc40", architecture="x86_64", repository="@System", summary="Manage Pods, Containers and Container Images"),
    PackageInfo(name="sqlite", version="3.45.1", release="1.fc40", architecture="x86_64", repository="@System", summary="C library that implements an SQL database engine")
]

MOCK_UPDATES = [
    PackageInfo(name="curl", version="8.7.1", release="2.fc40", architecture="x86_64", repository="updates", summary="Command line tool for transferring data with URLs"),
    PackageInfo(name="openssh-server", version="9.7p1", release="2.fc40", architecture="x86_64", repository="updates", summary="OpenSSH server daemon"),
    PackageInfo(name="podman", version="5.1.0", release="1.fc40", architecture="x86_64", repository="updates", summary="Manage Pods, Containers and Container Images")
]

MOCK_HISTORY = [
    UpdateHistoryEntry(id=42, command_line="upgrade -y", action="Upgrade", date="2026-06-10 14:30", user="admin"),
    UpdateHistoryEntry(id=41, command_line="install nginx", action="Install", date="2026-06-08 09:15", user="admin"),
    UpdateHistoryEntry(id=40, command_line="remove httpd", action="Erase", date="2026-06-05 18:22", user="admin")
]

class DnfService:
    @classmethod
    def is_dnf_available(cls) -> bool:
        from app.services.utils import force_mock_active
        return is_command_available("dnf") and is_command_available("rpm") and not force_mock_active()

    @classmethod
    def list_installed_packages(cls) -> List[PackageInfo]:
        if not cls.is_dnf_available():
            logger.info("RPM/DNF not available. Returning mock installed packages.")
            return MOCK_INSTALLED_PACKAGES

        # Use rpm query directly for extreme speed (avows loading full dnf DB)
        # Output format: name|version|release|arch|summary
        code, stdout, _ = run_system_command([
            "rpm", "-qa", "--qf", "%{NAME}|%{VERSION}|%{RELEASE}|%{ARCH}|%{SUMMARY}\n"
        ], timeout=10.0)

        packages = []
        if code == 0:
            for line in stdout.strip().split("\n"):
                if not line:
                    continue
                parts = line.split("|")
                if len(parts) >= 4:
                    packages.append(
                        PackageInfo(
                            name=parts[0],
                            version=parts[1],
                            release=parts[2],
                            architecture=parts[3],
                            repository="@System",
                            summary=parts[4] if len(parts) > 4 else ""
                        )
                    )
        
        if not packages:
            return MOCK_INSTALLED_PACKAGES
        return packages

    @classmethod
    def check_updates(cls) -> List[PackageInfo]:
        if not cls.is_dnf_available():
            logger.info("DNF not available. Returning mock updates.")
            return MOCK_UPDATES

        # dnf check-update returns 100 if updates are available, 0 if none, 1 on error
        code, stdout, stderr = run_system_command(["dnf", "check-update", "--quiet"], timeout=30.0)

        # Parse DNF updates. The format is typically:
        # package_name.arch version-release repository
        packages = []
        if code == 100 or code == 0:
            lines = stdout.strip().split("\n")
            for line in lines:
                if not line or line.startswith("Obsoleting") or line.startswith("Security"):
                    continue
                parts = line.split()
                if len(parts) >= 3:
                    pkg_and_arch = parts[0]
                    version_release = parts[1]
                    repo = parts[2]
                    
                    if "." in pkg_and_arch:
                        pkg_parts = pkg_and_arch.rsplit(".", 1)
                        name = pkg_parts[0]
                        arch = pkg_parts[1]
                    else:
                        name = pkg_and_arch
                        arch = "unknown"

                    # Split version and release
                    if "-" in version_release:
                        ver_parts = version_release.split("-", 1)
                        ver = ver_parts[0]
                        rel = ver_parts[1]
                    else:
                        ver = version_release
                        rel = "unknown"

                    packages.append(
                        PackageInfo(
                            name=name,
                            version=ver,
                            release=rel,
                            architecture=arch,
                            repository=repo,
                            summary="Update available"
                        )
                    )
        
        if not packages and code != 0:
            logger.warning("dnf check-update failed or returned empty. Falling back to mocks.")
            return MOCK_UPDATES
        return packages

    @classmethod
    def search_packages(cls, query: str) -> List[PackageInfo]:
        # Validate query pattern to prevent shell trickery (even though we don't use shell=True)
        if not query or not query.replace("-", "").replace("_", "").isalnum():
            return []

        if not cls.is_dnf_available():
            logger.info("DNF not available. Mocking search query.")
            return [pkg for pkg in MOCK_INSTALLED_PACKAGES if query.lower() in pkg.name.lower()]

        # Search packages
        code, stdout, _ = run_system_command(["dnf", "search", "--quiet", query], timeout=15.0)

        packages = []
        if code == 0:
            # Format is typically Name : Summary, followed by matching lines
            # A more parsing-friendly command is: dnf list available '*query*' or repoquery
            # Let's run a repoquery for clean structured output
            rq_code, rq_stdout, _ = run_system_command([
                "dnf", "repoquery", "--quiet", "--available", f"*{query}*", "--queryformat", "%{name}|%{version}|%{release}|%{arch}|%{summary}"
            ], timeout=15.0)
            
            if rq_code == 0:
                for line in rq_stdout.strip().split("\n"):
                    if not line:
                        continue
                    parts = line.split("|")
                    if len(parts) >= 4:
                        packages.append(
                            PackageInfo(
                                name=parts[0],
                                version=parts[1],
                                release=parts[2],
                                architecture=parts[3],
                                repository="fedora/updates",
                                summary=parts[4] if len(parts) > 4 else ""
                            )
                        )
        
        # Fallback search matching mocks
        if not packages:
            return [pkg for pkg in MOCK_INSTALLED_PACKAGES if query.lower() in pkg.name.lower()]
            
        return packages[:50] # cap results

    @classmethod
    def install_packages(cls, package_names: List[str]) -> PackageActionResponse:
        # Validate input strings
        for pkg in package_names:
            if not pkg.replace("-", "").replace("_", "").replace(".", "").replace("+", "").isalnum():
                return PackageActionResponse(success=False, message=f"Invalid package name format: {pkg}")

        if not cls.is_dnf_available():
            # Add to mock packages
            for pkg in package_names:
                MOCK_INSTALLED_PACKAGES.append(
                    PackageInfo(name=pkg, version="1.0.0", release="1.fc40", architecture="x86_64", repository="@System", summary="Mock installed package")
                )
            return PackageActionResponse(
                success=True,
                message=f"Mock: Packages installed: {', '.join(package_names)}"
            )

        cmd = ["dnf", "install", "-y"] + package_names
        code, stdout, stderr = run_system_command(cmd, timeout=120.0)

        if code == 0:
            return PackageActionResponse(
                success=True,
                message=f"Packages successfully installed: {', '.join(package_names)}",
                output=stdout
            )
        else:
            return PackageActionResponse(
                success=False,
                message=f"Failed to install packages. Code: {code}",
                output=stderr or stdout
            )

    @classmethod
    def get_update_history(cls) -> List[UpdateHistoryEntry]:
        if not cls.is_dnf_available():
            return MOCK_HISTORY

        code, stdout, _ = run_system_command(["dnf", "history", "list", "--no-legend"], timeout=15.0)

        history = []
        if code == 0:
            for line in stdout.strip().split("\n"):
                if not line:
                    continue
                # Line format: ID | Action(s) | Altered | Date and time
                # Let's split on '|'
                parts = [p.strip() for p in line.split("|")]
                if len(parts) >= 4:
                    try:
                        history.append(
                            UpdateHistoryEntry(
                                id=int(parts[0]),
                                command_line="Unknown", # Command details requires 'dnf history info ID'
                                action=parts[1],
                                date=parts[3],
                                user="system"
                            )
                        )
                    except ValueError:
                        pass
        
        if not history:
            return MOCK_HISTORY
        return history
