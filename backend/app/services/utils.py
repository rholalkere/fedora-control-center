import subprocess
import logging
from typing import List, Tuple, Optional

logger = logging.getLogger("fedora_control_center")

def run_system_command(cmd: List[str], timeout: float = 10.0) -> Tuple[int, str, str]:
    """
    Safely executes a system command without a shell (shell=False).
    Returns (return_code, stdout, stderr).
    If the command executable is not found, returns (127, "", "Command not found").
    """
    try:
        # Avoid shell=True to prevent shell injection vulnerabilities.
        # Ensure all inputs to cmd are list elements.
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout
        )
        return result.returncode, result.stdout, result.stderr
    except FileNotFoundError as e:
        logger.warning(f"System command not found: {cmd[0] if cmd else ''}")
        return 127, "", f"Command not found: {str(e)}"
    except subprocess.TimeoutExpired as e:
        logger.error(f"System command timed out: {' '.join(cmd)}")
        return -1, "", f"Command timeout expired ({timeout}s)"
    except Exception as e:
        logger.error(f"Error running command {' '.join(cmd)}: {str(e)}")
        return -2, "", f"Internal execution error: {str(e)}"

def is_command_available(cmd_name: str) -> bool:
    """Check if a CLI command is available on the system path."""
    code, _, _ = run_system_command(["which", cmd_name], timeout=2.0)
    return code == 0

def force_mock_active() -> bool:
    """Check if we want to bypass real system calls and force mocks (useful in tests/dev)."""
    import os
    return os.getenv("FORCE_MOCK", "false").lower() == "true"
