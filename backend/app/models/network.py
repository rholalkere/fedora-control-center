from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String, Boolean, BigInteger
from app.core.database import Base

class NetworkBlockedDevice(Base):
    __tablename__ = "network_blocked_devices"

    mac = Column(String, primary_key=True, index=True)
    ip = Column(String, nullable=True)
    hostname = Column(String, nullable=True)
    blocked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reason = Column(String, nullable=True)

class NetworkUsageHistory(Base):
    __tablename__ = "network_usage_history"

    id = Column(Integer, primary_key=True, index=True)
    device_mac = Column(String, index=True, nullable=True)
    device_ip = Column(String, nullable=False)
    device_hostname = Column(String, nullable=True)
    bytes_sent = Column(BigInteger, default=0)
    bytes_recv = Column(BigInteger, default=0)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class NetworkAccessLog(Base):
    __tablename__ = "network_access_logs"

    id = Column(Integer, primary_key=True, index=True)
    source_ip = Column(String, nullable=False, index=True)
    source_mac = Column(String, nullable=True, index=True)
    source_hostname = Column(String, nullable=True)
    destination_ip = Column(String, nullable=False, index=True)
    destination_domain = Column(String, nullable=True, index=True)
    destination_port = Column(Integer, nullable=False)
    bytes_sent = Column(BigInteger, default=0)
    bytes_recv = Column(BigInteger, default=0)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class NetworkBlockedDomain(Base):
    __tablename__ = "network_blocked_domains"

    domain = Column(String, primary_key=True, index=True)
    blocked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reason = Column(String, nullable=True)

