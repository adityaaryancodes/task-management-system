export function DesktopAppPage() {
  return (
    <div className="space-y-4">
      <div className="kpi-card">
        <h2 className="text-xl font-semibold">Desktop App Download</h2>
        <p className="text-sm text-slate-600 mt-2">
          Download the Windows monitoring agent and share this installer with employees.
        </p>
        <div className="mt-4">
          <a
            href="/downloads/Hybrid-Workforce-Agent-1.0.7.exe"
            download
            className="inline-flex items-center rounded-lg bg-brand-500 text-white px-4 py-2 text-sm"
          >
            Download Agent (.exe)
          </a>
        </div>
        <div className="mt-4 text-xs text-slate-500 space-y-1">
          <p>
            <span className="font-medium">File:</span> Hybrid-Workforce-Agent-1.0.7.exe
          </p>
          <p>
            <span className="font-medium">SHA256:</span> 0B9F1F49806457B6BD435E2B02FB37F1D29E4DA5F6AC4844A951AF3F2DAE7AB7
          </p>
        </div>
      </div>
    </div>
  );
}
