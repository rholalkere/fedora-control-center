from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime

class NetworkInterface(BaseModel):
    name: str
    type: str
    state: str
    is_up: bool
    ip_ipv4: Optional[str] = None
    ip_ipv6: Optional[str] = None
    mac: Optional[str] = None
    netmask: Optional[str] = None
    speed: Optional[int] = None  # In Mbps
    mtu: Optional[int] = None
    flags: Optional[str] = None
    bytes_sent: int
    bytes_recv: int
    packets_sent: int
    packets_recv: int

class ConnectedDevice(BaseModel):
    ip: str
    mac: str
    interface: str
    status: str
    hostname: Optional[str] = None
    vendor: Optional[str] = None

class ActiveSocket(BaseModel):
    proto: str  # tcp/udp
    state: str  # LISTEN/ESTABLISHED/etc.
    local_address: str
    local_port: int
    peer_address: str
    peer_port: Optional[int] = None

class RouteEntry(BaseModel):
    destination: str
    gateway: Optional[str] = None
    interface: str
    metric: Optional[int] = None
    source: Optional[str] = None

class WifiNetwork(BaseModel):
    ssid: str
    bssid: str
    channel: int
    rate: str
    signal: int  # 0-100
    bars: str
    security: str
    is_connected: bool = False

# Control and Analytics Schemas
class BlockDeviceRequest(BaseModel):
    mac: str
    ip: Optional[str] = None
    hostname: Optional[str] = None
    reason: Optional[str] = None

class UnblockDeviceRequest(BaseModel):
    mac: str

class BlockedDeviceResponse(BaseModel):
    mac: str
    ip: Optional[str] = None
    hostname: Optional[str] = None
    blocked_at: datetime
    reason: Optional[str] = None

    class Config:
        from_attributes = True

class UsageHistoryPoint(BaseModel):
    timestamp: datetime
    device_mac: Optional[str] = None
    device_ip: str
    device_hostname: Optional[str] = None
    bytes_sent: int
    bytes_recv: int

    class Config:
        from_attributes = True

class DeviceTrafficRank(BaseModel):
    mac: str
    ip: str
    hostname: Optional[str] = None
    bytes_sent: int
    bytes_recv: int
    total_bytes: int

class NetworkUsageAnalytics(BaseModel):
    history: List[UsageHistoryPoint]
    ranking: List[DeviceTrafficRank]

class AccessLogResponse(BaseModel):
    id: int
    source_ip: str
    source_mac: Optional[str] = None
    source_hostname: Optional[str] = None
    destination_ip: str
    destination_domain: Optional[str] = None
    destination_port: int
    bytes_sent: int
    bytes_recv: int
    timestamp: datetime

    class Config:
        from_attributes = True


class BlockDomainRequest(BaseModel):
    domain: str
    reason: Optional[str] = None

class UnblockDomainRequest(BaseModel):
    domain: str

class BlockedDomainResponse(BaseModel):
    domain: str
    blocked_at: datetime
    reason: Optional[str] = None

    class Config:
        from_attributes = True


