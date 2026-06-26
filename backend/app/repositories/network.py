from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.network import NetworkBlockedDevice, NetworkUsageHistory, NetworkAccessLog

class NetworkRepository:
    # --- Blocked Devices ---
    @staticmethod
    def block_device(db: Session, mac: str, ip: Optional[str] = None, hostname: Optional[str] = None, reason: Optional[str] = None) -> NetworkBlockedDevice:
        mac_lower = mac.lower()
        db_blocked = db.query(NetworkBlockedDevice).filter(NetworkBlockedDevice.mac == mac_lower).first()
        if not db_blocked:
            db_blocked = NetworkBlockedDevice(
                mac=mac_lower,
                ip=ip,
                hostname=hostname,
                reason=reason
            )
            db.add(db_blocked)
        else:
            if ip: db_blocked.ip = ip
            if hostname: db_blocked.hostname = hostname
            db_blocked.reason = reason
            db_blocked.blocked_at = datetime.now(timezone.utc)
            
        db.commit()
        db.refresh(db_blocked)
        return db_blocked

    @staticmethod
    def unblock_device(db: Session, mac: str) -> bool:
        mac_lower = mac.lower()
        db_blocked = db.query(NetworkBlockedDevice).filter(NetworkBlockedDevice.mac == mac_lower).first()
        if db_blocked:
            db.delete(db_blocked)
            db.commit()
            return True
        return False

    @staticmethod
    def get_blocked_devices(db: Session) -> List[NetworkBlockedDevice]:
        return db.query(NetworkBlockedDevice).all()

    @staticmethod
    def is_device_blocked(db: Session, mac: str) -> bool:
        mac_lower = mac.lower()
        return db.query(NetworkBlockedDevice).filter(NetworkBlockedDevice.mac == mac_lower).count() > 0

    # --- Usage History ---
    @staticmethod
    def log_usage(db: Session, mac: Optional[str], ip: str, hostname: Optional[str], bytes_sent: int, bytes_recv: int) -> NetworkUsageHistory:
        mac_lower = mac.lower() if mac else None
        
        # Check if there is already an entry for this device in the last 10 minutes to save DB space
        ten_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=10)
        db_entry = db.query(NetworkUsageHistory).filter(
            NetworkUsageHistory.device_mac == mac_lower,
            NetworkUsageHistory.timestamp >= ten_mins_ago
        ).order_by(NetworkUsageHistory.timestamp.desc()).first()

        if db_entry:
            # Accumulate
            db_entry.bytes_sent += bytes_sent
            db_entry.bytes_recv += bytes_recv
            db_entry.device_ip = ip
            if hostname: db_entry.device_hostname = hostname
            db_entry.timestamp = datetime.now(timezone.utc)
        else:
            db_entry = NetworkUsageHistory(
                device_mac=mac_lower,
                device_ip=ip,
                device_hostname=hostname,
                bytes_sent=bytes_sent,
                bytes_recv=bytes_recv
            )
            db.add(db_entry)
            
        db.commit()
        db.refresh(db_entry)
        return db_entry

    @staticmethod
    def get_usage_history(db: Session, range_days: int = 7) -> List[NetworkUsageHistory]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=range_days)
        return db.query(NetworkUsageHistory).filter(
            NetworkUsageHistory.timestamp >= cutoff
        ).order_by(NetworkUsageHistory.timestamp.asc()).all()

    @staticmethod
    def get_device_traffic_ranking(db: Session, range_days: int = 7) -> List[Dict]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=range_days)
        
        # Group by MAC and sum up
        results = db.query(
            NetworkUsageHistory.device_mac,
            NetworkUsageHistory.device_ip,
            NetworkUsageHistory.device_hostname,
            func.sum(NetworkUsageHistory.bytes_sent).label("total_sent"),
            func.sum(NetworkUsageHistory.bytes_recv).label("total_recv")
        ).filter(
            NetworkUsageHistory.timestamp >= cutoff
        ).group_by(
            NetworkUsageHistory.device_mac
        ).all()

        ranking = []
        for r in results:
            if not r.device_mac:
                continue
            ranking.append({
                "mac": r.device_mac,
                "ip": r.device_ip,
                "hostname": r.device_hostname,
                "bytes_sent": int(r.total_sent),
                "bytes_recv": int(r.total_recv),
                "total_bytes": int(r.total_sent) + int(r.total_recv)
            })
            
        # Sort by total traffic desc
        ranking.sort(key=lambda x: x["total_bytes"], reverse=True)
        return ranking

    # --- Access Logs ---
    @staticmethod
    def log_access(
        db: Session, 
        source_ip: str, 
        source_mac: Optional[str], 
        source_hostname: Optional[str], 
        destination_ip: str, 
        destination_domain: Optional[str], 
        destination_port: int,
        bytes_sent: int = 0,
        bytes_recv: int = 0
    ) -> NetworkAccessLog:
        # Check if identical connection was logged in the last 2 minutes
        two_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=2)
        db_log = db.query(NetworkAccessLog).filter(
            NetworkAccessLog.source_ip == source_ip,
            NetworkAccessLog.destination_ip == destination_ip,
            NetworkAccessLog.destination_port == destination_port,
            NetworkAccessLog.timestamp >= two_mins_ago
        ).first()

        if db_log:
            db_log.bytes_sent += bytes_sent
            db_log.bytes_recv += bytes_recv
            db_log.timestamp = datetime.now(timezone.utc)
            if destination_domain:
                db_log.destination_domain = destination_domain
        else:
            db_log = NetworkAccessLog(
                source_ip=source_ip,
                source_mac=source_mac.lower() if source_mac else None,
                source_hostname=source_hostname,
                destination_ip=destination_ip,
                destination_domain=destination_domain,
                destination_port=destination_port,
                bytes_sent=bytes_sent,
                bytes_recv=bytes_recv
            )
            db.add(db_log)
            
        db.commit()
        db.refresh(db_log)
        return db_log

    @staticmethod
    def get_access_logs(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        source_ip: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[NetworkAccessLog]:
        query = db.query(NetworkAccessLog)
        if source_ip:
            query = query.filter(NetworkAccessLog.source_ip == source_ip)
        if search:
            query = query.filter(
                (NetworkAccessLog.destination_ip.like(f"%{search}%")) |
                (NetworkAccessLog.destination_domain.like(f"%{search}%")) |
                (NetworkAccessLog.source_hostname.like(f"%{search}%"))
            )
        return query.order_by(NetworkAccessLog.timestamp.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def cleanup_old_logs(db: Session, max_age_days: int = 30) -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)
        deleted = db.query(NetworkAccessLog).filter(NetworkAccessLog.timestamp < cutoff).delete()
        db.commit()
        return deleted
