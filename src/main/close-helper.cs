// Stop > "Close the game too": finds the processes running from a game's folder and asks their windows to
// close (WM_CLOSE, the same as clicking X). Never kills a process; a game that ignores the request keeps running.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

public static class SDClose
{
    delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb, IntPtr lParam);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr hWnd, uint cmd);
    [DllImport("user32.dll")] static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr w, IntPtr l);
    [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern bool QueryFullProcessImageName(IntPtr h, int flags, StringBuilder name, ref int size);
    const uint QUERY_LIMITED = 0x1000;

    // The .exe path. QueryFullProcessImageName needs only limited rights, so it also works for most games run
    // as admin or behind anti-cheat, where Process.MainModule is refused.
    static string PathOf(Process p)
    {
        var h = OpenProcess(QUERY_LIMITED, false, p.Id);
        if (h != IntPtr.Zero)
        {
            try { var sb = new StringBuilder(1024); int n = sb.Capacity; if (QueryFullProcessImageName(h, 0, sb, ref n)) return sb.ToString(); }
            finally { CloseHandle(h); }
        }
        try { return p.MainModule.FileName; } catch { return null; }
    }
    const uint WM_CLOSE = 0x0010, GW_OWNER = 4;

    static string Norm(string p) { return Path.GetFullPath(p).TrimEnd('\\').ToLowerInvariant() + "\\"; }

    // Processes whose .exe sits in the folder (or below it), or that run exactly this .exe. Ones Windows won't
    // let us read (protected or elevated) are skipped.
    static List<Process> Find(string target)
    {
        bool exact = target.ToLowerInvariant().EndsWith(".exe");
        var root = exact ? Path.GetFullPath(target).ToLowerInvariant() : Norm(target);
        var list = new List<Process>();
        foreach (var p in Process.GetProcesses())
        {
            try
            {
                var file = PathOf(p);
                var f = file == null ? "" : file.ToLowerInvariant();
                if (exact ? f == root : f.StartsWith(root)) list.Add(p);
            }
            catch { }
        }
        return list;
    }

    static string Json(List<Process> procs, int windows)
    {
        var sb = new StringBuilder("{\"procs\":[");
        for (int i = 0; i < procs.Count; i++)
        {
            if (i > 0) sb.Append(',');
            sb.Append("{\"pid\":").Append(procs[i].Id).Append(",\"name\":\"").Append(procs[i].ProcessName.Replace("\\", "\\\\").Replace("\"", "\\\"")).Append("\"}");
        }
        return sb.Append("],\"windows\":").Append(windows).Append('}').ToString();
    }

    public static string Run(string cmd, string arg)
    {
        if (string.IsNullOrEmpty(arg) || !(Directory.Exists(arg) || File.Exists(arg))) return "{\"procs\":[],\"windows\":0}";
        var procs = Find(arg);
        if (cmd != "close") return Json(procs, 0);
        var pids = new HashSet<uint>();
        foreach (var p in procs) pids.Add((uint)p.Id);
        int sent = 0;
        // Only visible top-level windows: the same ones a user could click X on.
        EnumWindows((h, l) =>
        {
            uint pid;
            GetWindowThreadProcessId(h, out pid);
            if (pids.Contains(pid) && IsWindowVisible(h) && GetWindow(h, GW_OWNER) == IntPtr.Zero && PostMessage(h, WM_CLOSE, IntPtr.Zero, IntPtr.Zero)) sent++;
            return true;
        }, IntPtr.Zero);
        return Json(procs, sent);
    }
}
