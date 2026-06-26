from typing import Dict, List, Optional
from pydantic import BaseModel

class HostInfo(BaseModel):
    hostname: str
    os_name: str  # e.g., Fedora Workstation
    os_version: str  # e.g., 40
    kernel: str
    uptime: float
    architecture: str
    chassis_type: str
    boot_time: float
    install_date: Optional[str] = None
    system_age_days: Optional[int] = None
    hardware_model: Optional[str] = None
    hardware_vendor: Optional[str] = None

class CpuMetrics(BaseModel):
    usage_percent: float
    cores_logical: int
    cores_physical: int
    frequency_mhz: float
    temperature_c: Optional[float] = None
    processor_name: Optional[str] = None

class MemoryMetrics(BaseModel):
    total: int
    available: int
    used: int
    percent: float

class DiskMetrics(BaseModel):
    device: str
    mountpoint: str
    total: int
    used: int
    free: int
    percent: float

class NetworkInterfaceMetrics(BaseModel):
    bytes_sent: int
    bytes_recv: int
    packets_sent: int
    packets_recv: int
    speed_mbps: Optional[int] = None

class GpuMetrics(BaseModel):
    vendor: str  # NVIDIA, AMD, Intel
    model: str
    load_percent: float
    memory_total: int
    memory_used: int
    memory_free: int
    temperature_c: Optional[float] = None

class BatteryMetrics(BaseModel):
    has_battery: bool
    percent: float
    power_plugged: bool
    secs_left: int
    health_percent: Optional[float] = None

class SystemMetrics(BaseModel):
    host: HostInfo
    cpu: CpuMetrics
    ram: MemoryMetrics
    swap: MemoryMetrics
    disks: List[DiskMetrics]
    network: Dict[str, NetworkInterfaceMetrics]
    gpu: List[GpuMetrics]
    battery: Optional[BatteryMetrics] = None


class ProcessInfo(BaseModel):
    pid: int
    name: str
    username: str
    status: str
    cpu_percent: float
    memory_percent: float
    cmdline: str

class KillProcessRequest(BaseModel):
    pid: int

class PowerProfileInfo(BaseModel):
    active_profile: str
    profiles: List[str]
    driver: str

class SetPowerProfileRequest(BaseModel):
    profile: str

