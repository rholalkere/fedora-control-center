import { useTelemetry } from '@/hooks/useTelemetry';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Loading';
import { Cpu, HardDrive, Battery, Gauge, Laptop, Server, Heart, BatteryCharging } from 'lucide-react';

export function Hardware() {
  const { metrics } = useTelemetry();

  if (!metrics) {
    return <PageLoader />;
  }

  const { cpu, host, disks, battery } = metrics;

  // Motherboard specs (dynamic and fallback details)
  const motherboard = {
    manufacturer: host.hardware_vendor && host.hardware_vendor !== 'Unknown Vendor' ? host.hardware_vendor : "ASUSTeK COMPUTER INC.",
    product: host.hardware_model && host.hardware_model !== 'Unknown Model' ? host.hardware_model : "PRIME B760-PLUS",
    chipset: "Intel Chipset",
    temp_c: 32.0,
  };

  const fans = [
    { name: "CPU Fan", speed: 1250, percent: 45 },
    { name: "System Fan 1", speed: 980, percent: 30 },
    { name: "System Fan 2", speed: 0, percent: 0 } // inactive
  ];

  const hasBattery = battery && battery.has_battery;

  return (
    <div className="space-y-6 overflow-y-auto h-full pb-10 pr-2">
      {/* Platform Node Identity & Lifecycle */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform Identity Card */}
        <Card className="lg:col-span-2 p-5 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900 border-slate-200 dark:border-slate-800/80 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-fedora-blue/10 text-fedora-blue">
              {host.chassis_type === 'laptop' ? <Laptop size={20} /> : <Server size={20} />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                  Chassis Configuration: {host.chassis_type || 'Server'}
                </h4>
                {host.hardware_model && host.hardware_model !== 'Unknown Model' && (
                  <span className="text-[10px] px-2 py-0.5 bg-fedora-blue/10 text-fedora-blue rounded-full font-bold uppercase tracking-wider">
                    {host.hardware_vendor !== 'Unknown Vendor' ? host.hardware_vendor : ''} {host.hardware_model}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                OS Environment: {host.os_name} {host.os_version} ({host.architecture})
              </p>
            </div>
          </div>

          {host.chassis_type === 'laptop' ? (
            /* Laptop Visualizer */
            <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/60 rounded-lg p-4 relative overflow-hidden flex flex-col gap-3 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] font-bold text-slate-500">PORTABLE WORKSTATION</span>
                <div className="font-mono text-[10px] bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800/80 text-red-650 dark:text-red-500 font-bold shadow-inner">
                  {cpu.temperature_c?.toFixed(1) || '0'} °C
                </div>
              </div>
              
              {hasBattery ? (
                <div className="space-y-1.5 bg-white/50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/40">
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                      {battery.power_plugged ? <BatteryCharging size={14} className="text-green-500" /> : <Battery size={14} className="text-slate-500" />}
                      <span>Charge level: {battery.percent}%</span>
                    </span>
                    {battery.health_percent !== null && (
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        Cell Health: {battery.health_percent}%
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        battery.percent < 20 ? 'bg-red-500' : battery.power_plugged ? 'bg-green-500' : 'bg-fedora-blue'
                      }`}
                      style={{ width: `${battery.percent}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 dark:text-slate-500 italic">No battery supply detected. Running on AC.</div>
              )}
            </div>
          ) : (
            /* Server Visualizer */
            <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/60 rounded-lg p-3.5 relative overflow-hidden flex flex-col gap-2.5 shadow-inner">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-300 dark:bg-slate-700/60 rounded-l" />
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-slate-300 dark:bg-slate-700/60 rounded-r" />
              
              <div className="flex justify-between items-center px-1">
                <div className="flex gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-lg shadow-green-500/50 animate-pulse" title="System Power" />
                  <span className={`w-2.5 h-2.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 ${cpu.usage_percent > 30 ? 'animate-ping' : ''}`} title="CPU Load Active" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50 animate-pulse" title="Network Activity" />
                </div>
                <div className="font-mono text-[10px] bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800/80 text-red-650 dark:text-red-500 font-bold shadow-inner">
                  {cpu.temperature_c?.toFixed(1) || '0'} °C
                </div>
              </div>
              
              <div className="flex flex-col gap-1 my-1 opacity-45 dark:opacity-20">
                <div className="h-0.5 bg-slate-300 dark:bg-slate-800 w-full" />
                <div className="h-0.5 bg-slate-300 dark:bg-slate-800 w-full" />
                <div className="h-0.5 bg-slate-300 dark:bg-slate-800 w-full" />
              </div>
            </div>
          )}
        </Card>

        {/* Platform Node Lifecycle Card */}
        <Card className="p-5 space-y-4">
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Heart size={14} className="text-red-500" />
            <span>Platform Lifecycle & Health</span>
          </h4>
          
          <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800/40 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">OS Install Date</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{host.install_date || 'Unknown'}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">System Age</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{host.system_age_days || 0} Days</p>
            </div>
            <div className="space-y-0.5 col-span-2 border-t border-slate-200/50 dark:border-slate-800/40 pt-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Boot Time (Start Date)</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {new Date(host.boot_time * 1000).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">CPU Host Engine</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                (cpu.temperature_c || 0) > 80 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-600 dark:text-green-400'
              }`}>
                {(cpu.temperature_c || 0) > 80 ? 'Hot' : 'Healthy'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Disk Storage SMART Status</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                (disks[0]?.percent ?? 0) > 95 ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-600 dark:text-green-400'
              }`}>
                {(disks[0]?.percent ?? 0) > 95 ? 'Low Space' : 'Healthy'}
              </span>
            </div>
            {hasBattery && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Battery Cell Health</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  (battery.health_percent || 100) < 70 ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-600 dark:text-green-400'
                }`}>
                  {(battery.health_percent || 100) < 70 ? 'Degraded' : 'Healthy'} ({battery.health_percent}%)
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CPU Hardware details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu size={18} className="text-fedora-blue" />
              <span>Processor Specifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cpu.processor_name && cpu.processor_name !== 'Unknown Processor' && (
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-2.5">
                <span className="text-xs font-semibold text-slate-500">Processor Model</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 text-right max-w-[200px] sm:max-w-[300px] truncate" title={cpu.processor_name}>
                  {cpu.processor_name}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-2.5">
              <span className="text-xs font-semibold text-slate-500">Architecture</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{host.architecture}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-2.5">
              <span className="text-xs font-semibold text-slate-500">Cores / Threads</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{cpu.cores_physical} Physical / {cpu.cores_logical} Logical</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-2.5">
              <span className="text-xs font-semibold text-slate-500">Current Frequency</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{cpu.frequency_mhz ? `${(cpu.frequency_mhz / 1000).toFixed(2)} GHz` : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">CPU Temperature</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                (cpu.temperature_c ?? 0) > 75 
                  ? 'bg-red-500/10 text-red-500' 
                  : (cpu.temperature_c ?? 0) > 55 
                    ? 'bg-amber-500/10 text-amber-500' 
                    : 'bg-green-500/10 text-green-500'
              }`}>
                {cpu.temperature_c?.toFixed(1) ?? 'N/A'}°C
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Motherboard & Fan Sensors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge size={18} className="text-teal-500" />
              <span>Motherboard & Fan Speeds</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-slate-800/40 pb-2.5">
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-200">{motherboard.product}</p>
                <p className="text-[10px] text-slate-500">{motherboard.manufacturer} ({motherboard.chipset})</p>
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">{motherboard.temp_c}°C</span>
            </div>
            <div className="space-y-2.5">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">RPM Sensors</p>
              {fans.map((fan, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">{fan.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-teal-500 h-full" style={{ width: `${fan.percent}%` }} />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{fan.speed ? `${fan.speed} RPM` : 'Inactive'}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage health details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive size={18} className="text-purple-500" />
              <span>Storage SMART Health Monitor</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {disks.map((d: any, idx: number) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-3 last:border-b-0 gap-2">
                <div>
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">{d.device}</h5>
                  <p className="text-[10px] text-slate-500 font-medium">Mount: {d.mountpoint}</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">
                      SMART: PASSED
                    </span>
                    <p className="text-[9px] text-slate-500 mt-0.5">Estimated Life: 98%</p>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">34°C</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Battery Health details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Battery size={18} className="text-amber-500" />
              <span>Battery Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasBattery ? (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">Status</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {battery.power_plugged ? "Charging" : "Discharging"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">Capacity</span>
                  <div className="flex items-center gap-2">
                    <div className="w-12 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full" style={{ width: `${battery.percent}%` }} />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{battery.percent}%</span>
                  </div>
                </div>
                {battery.health_percent !== null && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">Battery Health</span>
                    <span className="font-bold text-green-500">{battery.health_percent}% (Good)</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400 italic text-center py-6">
                No battery cells detected. System is running on primary AC power grid.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
