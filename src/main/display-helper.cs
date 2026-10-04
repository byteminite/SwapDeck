// SwapDeck display helper: list monitors and their modes, make one primary (switching it on if needed),
// use only one, and apply or restore a layout (positions, resolutions, stretch). Compiled once by PowerShell (Add-Type) into a DLL in
// SwapDeck's app data. Uses EnumDisplayDevices / EnumDisplaySettingsEx / ChangeDisplaySettingsEx.
// Written for the C# 5 compiler that ships with Windows PowerShell.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;

public static class SDDisplay
{
    const int ENUM_CURRENT = -1, ENUM_REGISTRY = -2;
    const int ATTACHED = 0x1, PRIMARY = 0x4, MIRROR = 0x8;
    const int DM_POSITION = 0x20, DM_ORIENT = 0x80, DM_W = 0x80000, DM_H = 0x100000, DM_HZ = 0x400000, DM_FIXEDOUTPUT = 0x20000000;
    const uint QDC_ONLY_ACTIVE_PATHS = 0x2;
    const uint SDC_TOPOLOGY_EXTEND = 0x4, SDC_USE_SUPPLIED_DISPLAY_CONFIG = 0x20, SDC_APPLY = 0x80, SDC_SAVE_TO_DATABASE = 0x200, SDC_ALLOW_CHANGES = 0x400;
    const int PATH_SIZE = 72, MODE_SIZE = 64; // DISPLAYCONFIG_PATH_INFO, DISPLAYCONFIG_MODE_INFO
    const uint CDS_UPDATEREGISTRY = 0x1, CDS_SET_PRIMARY = 0x10, CDS_NORESET = 0x10000000;
    const uint EDD_GET_DEVICE_INTERFACE_NAME = 0x1;
    const int EDS_RAWMODE = 0x2;

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct DISPLAY_DEVICE
    {
        public int cb;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string DeviceName;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceString;
        public int StateFlags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceID;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceKey;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct DEVMODE
    {
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmDeviceName;
        public short dmSpecVersion, dmDriverVersion, dmSize, dmDriverExtra;
        public int dmFields;
        public int dmPositionX, dmPositionY, dmDisplayOrientation, dmDisplayFixedOutput;
        public short dmColor, dmDuplex, dmYResolution, dmTTOption, dmCollate;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmFormName;
        public short dmLogPixels;
        public int dmBitsPerPel, dmPelsWidth, dmPelsHeight, dmDisplayFlags, dmDisplayFrequency;
        public int dmICMMethod, dmICMIntent, dmMediaType, dmDitherType, dmReserved1, dmReserved2, dmPanningWidth, dmPanningHeight;
    }

    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern bool EnumDisplayDevices(string dev, uint i, ref DISPLAY_DEVICE dd, uint flags);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern bool EnumDisplaySettingsEx(string dev, int mode, ref DEVMODE dm, int flags);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int ChangeDisplaySettingsEx(string dev, ref DEVMODE dm, IntPtr hwnd, uint flags, IntPtr lp);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int ChangeDisplaySettingsEx(string dev, IntPtr dm, IntPtr hwnd, uint flags, IntPtr lp);
    [DllImport("user32.dll")] static extern int GetDisplayConfigBufferSizes(uint flags, out uint numPaths, out uint numModes);
    [DllImport("user32.dll")] static extern int QueryDisplayConfig(uint flags, ref uint numPaths, IntPtr paths, ref uint numModes, IntPtr modes, IntPtr topology);
    [DllImport("user32.dll")] static extern int SetDisplayConfig(uint numPaths, IntPtr paths, uint numModes, IntPtr modes, uint flags);

    class Mon
    {
        public string name = "", monitor = "", hwid = "", key = "";
        public bool attached, primary;
        public int x, y, w, h, hz;   // current (or registry) mode
        public int bw, bh, bhz;      // best available mode, used when switching a monitor on
        public int fo = -1;          // scaling (0 default, 1 centre, 2 stretch); -1 = unknown / leave alone
        public int or = -1;          // rotation (0, 1 = 90°, 2 = 180°, 3 = 270°); -1 = unknown / leave alone
    }

    static DEVMODE NewDm() { var dm = new DEVMODE(); dm.dmSize = (short)Marshal.SizeOf(typeof(DEVMODE)); return dm; }

    // Model name from the monitor's EDID in the registry. Works for switched-off monitors too.
    static string EdidName(string iface)
    {
        try
        {
            // \\?\DISPLAY#GSM76FE#7&1e010a3f&1&UID520#{guid}  ->  Enum\DISPLAY\GSM76FE\7&1e010a3f&1&UID520
            var p = iface.Split('#');
            if (p.Length < 3) return "";
            var path = "SYSTEM\\CurrentControlSet\\Enum\\DISPLAY\\" + p[1] + "\\" + p[2] + "\\Device Parameters";
            using (var k = Microsoft.Win32.Registry.LocalMachine.OpenSubKey(path))
            {
                var e = k == null ? null : k.GetValue("EDID") as byte[];
                if (e == null || e.Length < 128) return "";
                for (int d = 54; d <= 108; d += 18)
                    if (e[d] == 0 && e[d + 1] == 0 && e[d + 2] == 0 && e[d + 3] == 0xFC)
                        return Encoding.ASCII.GetString(e, d + 5, 13).Split('\n')[0].Trim();
            }
        }
        catch { }
        return "";
    }

    static List<Mon> List()
    {
        var list = new List<Mon>();
        for (uint i = 0; ; i++)
        {
            var dd = new DISPLAY_DEVICE(); dd.cb = Marshal.SizeOf(dd);
            if (!EnumDisplayDevices(null, i, ref dd, 0)) break;
            if ((dd.StateFlags & MIRROR) != 0) continue;
            var md = new DISPLAY_DEVICE(); md.cb = Marshal.SizeOf(md);
            // Outputs without a real monitor don't return an interface name: skip those phantoms.
            if (!EnumDisplayDevices(dd.DeviceName, 0, ref md, EDD_GET_DEVICE_INTERFACE_NAME) || string.IsNullOrEmpty(md.DeviceID)) continue;
            var hw = md.DeviceID.Split('#');
            var m = new Mon
            {
                name = dd.DeviceName,
                hwid = hw.Length > 1 ? hw[1] : "",
                key = hw.Length > 2 ? hw[1] + "#" + hw[2] : dd.DeviceName,
                monitor = EdidName(md.DeviceID),
                attached = (dd.StateFlags & ATTACHED) != 0,
                primary = (dd.StateFlags & PRIMARY) != 0
            };
            var bm = NewDm();
            for (int k = 0; EnumDisplaySettingsEx(dd.DeviceName, k, ref bm, 0); k++)
            {
                // Modes come back in the output's remembered rotation (an output that last drove a portrait
                // monitor lists them sideways): report the unrotated size.
                bool rot = bm.dmDisplayOrientation == 1 || bm.dmDisplayOrientation == 3;
                int bw = rot ? bm.dmPelsHeight : bm.dmPelsWidth, bh = rot ? bm.dmPelsWidth : bm.dmPelsHeight;
                bool bigger = (long)bw * bh > (long)m.bw * m.bh;
                bool faster = bw == m.bw && bh == m.bh && bm.dmDisplayFrequency > m.bhz;
                if (bigger || faster) { m.bw = bw; m.bh = bh; m.bhz = bm.dmDisplayFrequency; }
            }
            var dm = NewDm();
            if (EnumDisplaySettingsEx(dd.DeviceName, m.attached ? ENUM_CURRENT : ENUM_REGISTRY, ref dm, 0))
            { m.x = dm.dmPositionX; m.y = dm.dmPositionY; m.w = dm.dmPelsWidth; m.h = dm.dmPelsHeight; m.hz = dm.dmDisplayFrequency; if (m.attached) { m.fo = dm.dmDisplayFixedOutput; m.or = dm.dmDisplayOrientation; } }
            // A switched-off monitor can show up under several of the GPU's free outputs.
            // Keep one entry per physical monitor: the attached one, else the first.
            var dup = list.Find(x => x.key == m.key);
            if (dup == null) list.Add(m);
            else if (m.attached && !dup.attached) list[list.IndexOf(dup)] = m;
        }
        return list;
    }

    static string Apply(List<Mon> target, List<Mon> cur)
    {
        // Primary first: Windows expects the primary at 0,0 before the others are placed.
        target.Sort((a, b) => (b.primary && b.attached ? 1 : 0) - (a.primary && a.attached ? 1 : 0));
        foreach (var t in target)
        {
            if (!t.attached)
            {
                var c = cur.Find(m => m.name == t.name);
                if (c == null || !c.attached) continue; // already off
            }
            var dm = NewDm();
            if (!EnumDisplaySettingsEx(t.name, ENUM_REGISTRY, ref dm, 0)) EnumDisplaySettingsEx(t.name, ENUM_CURRENT, ref dm, 0);
            dm.dmSize = (short)Marshal.SizeOf(typeof(DEVMODE));
            uint flags = CDS_UPDATEREGISTRY | CDS_NORESET;
            if (t.attached)
            {
                dm.dmFields = DM_POSITION | DM_W | DM_H | (t.hz > 0 ? DM_HZ : 0);
                dm.dmPositionX = t.x; dm.dmPositionY = t.y; dm.dmPelsWidth = t.w; dm.dmPelsHeight = t.h;
                if (t.hz > 0) dm.dmDisplayFrequency = t.hz;
                if (t.primary) flags |= CDS_SET_PRIMARY;
                // Scaling (stretch) only when asked for and different from now: some drivers reject the field.
                var c = cur.Find(m => m.name == t.name);
                if (t.fo >= 0 && c != null && c.fo >= 0 && c.fo != t.fo) { dm.dmFields |= DM_FIXEDOUTPUT; dm.dmDisplayFixedOutput = t.fo; }
                // Rotation: a portrait monitor switched back on must get its rotation too, or its size doesn't exist.
                if (t.or >= 0) { dm.dmFields |= DM_ORIENT; dm.dmDisplayOrientation = t.or; }
            }
            else
            {
                // Zero size removes the monitor from the desktop.
                dm.dmFields = DM_POSITION | DM_W | DM_H;
                dm.dmPositionX = 0; dm.dmPositionY = 0; dm.dmPelsWidth = 0; dm.dmPelsHeight = 0;
            }
            int r = ChangeDisplaySettingsEx(t.name, ref dm, IntPtr.Zero, flags, IntPtr.Zero);
            if (r != 0) return "error:" + t.name + ":" + r;
        }
        int res = ChangeDisplaySettingsEx(null, IntPtr.Zero, IntPtr.Zero, 0, IntPtr.Zero);
        return res == 0 ? "ok" : "error:apply:" + res;
    }

    static string J(string s) { return "\"" + (s ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"") + "\""; }

    static string ToJson(List<Mon> list)
    {
        var sb = new StringBuilder("[");
        for (int i = 0; i < list.Count; i++)
        {
            var m = list[i];
            if (i > 0) sb.Append(',');
            sb.Append("{\"name\":").Append(J(m.name)).Append(",\"key\":").Append(J(m.key)).Append(",\"monitor\":").Append(J(m.monitor)).Append(",\"hwid\":").Append(J(m.hwid))
              .Append(",\"attached\":").Append(m.attached ? "true" : "false").Append(",\"primary\":").Append(m.primary ? "true" : "false")
              .Append(",\"x\":").Append(m.x).Append(",\"y\":").Append(m.y).Append(",\"w\":").Append(m.w).Append(",\"h\":").Append(m.h)
              .Append(",\"hz\":").Append(m.hz).Append(",\"fo\":").Append(m.fo).Append(",\"or\":").Append(m.or).Append(",\"bw\":").Append(m.bw).Append(",\"bh\":").Append(m.bh).Append(",\"bhz\":").Append(m.bhz)
              .Append('}');
        }
        return sb.Append(']').ToString();
    }

    // Saved layout format: name|attached|primary|x|y|w|h|hz[|fo[|or]];...
    static List<Mon> Parse(string s)
    {
        var list = new List<Mon>();
        var ci = CultureInfo.InvariantCulture;
        foreach (var part in s.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries))
        {
            var f = part.Split('|');
            if (f.Length < 8) continue;
            list.Add(new Mon
            {
                name = f[0], attached = f[1] == "1", primary = f[2] == "1",
                x = int.Parse(f[3], ci), y = int.Parse(f[4], ci), w = int.Parse(f[5], ci), h = int.Parse(f[6], ci), hz = int.Parse(f[7], ci),
                fo = f.Length > 8 ? int.Parse(f[8], ci) : -1,
                or = f.Length > 9 ? int.Parse(f[9], ci) : -1
            });
        }
        return list;
    }

    // Windows' own display configuration (what Win+P and Display settings use): every active path with its
    // source, target, position, mode and rotation. Saved as base64 and handed back as-is to restore exactly.
    static string CcdSave()
    {
        uint np, nm;
        int r = GetDisplayConfigBufferSizes(QDC_ONLY_ACTIVE_PATHS, out np, out nm);
        if (r != 0) return "error:ccd-size:" + r;
        IntPtr p = Marshal.AllocHGlobal((int)np * PATH_SIZE), m = Marshal.AllocHGlobal((int)nm * MODE_SIZE);
        try
        {
            r = QueryDisplayConfig(QDC_ONLY_ACTIVE_PATHS, ref np, p, ref nm, m, IntPtr.Zero);
            if (r != 0) return "error:ccd-query:" + r;
            var bytes = new byte[8 + np * PATH_SIZE + nm * MODE_SIZE];
            BitConverter.GetBytes(np).CopyTo(bytes, 0);
            BitConverter.GetBytes(nm).CopyTo(bytes, 4);
            Marshal.Copy(p, bytes, 8, (int)np * PATH_SIZE);
            Marshal.Copy(m, bytes, 8 + (int)np * PATH_SIZE, (int)nm * MODE_SIZE);
            return "ccd:" + Convert.ToBase64String(bytes);
        }
        finally { Marshal.FreeHGlobal(p); Marshal.FreeHGlobal(m); }
    }

    static string CcdRestore(string b64)
    {
        byte[] bytes;
        try { bytes = Convert.FromBase64String(b64); } catch { return "error:ccd-data"; }
        if (bytes.Length < 8) return "error:ccd-data";
        uint np = BitConverter.ToUInt32(bytes, 0), nm = BitConverter.ToUInt32(bytes, 4);
        if (bytes.Length != 8 + np * PATH_SIZE + nm * MODE_SIZE) return "error:ccd-data";
        IntPtr p = Marshal.AllocHGlobal((int)Math.Max(1, np * PATH_SIZE)), m = Marshal.AllocHGlobal((int)Math.Max(1, nm * MODE_SIZE));
        try
        {
            Marshal.Copy(bytes, 8, p, (int)np * PATH_SIZE);
            Marshal.Copy(bytes, 8 + (int)np * PATH_SIZE, m, (int)nm * MODE_SIZE);
            int r = SetDisplayConfig(np, p, nm, m, SDC_APPLY | SDC_USE_SUPPLIED_DISPLAY_CONFIG | SDC_ALLOW_CHANGES | SDC_SAVE_TO_DATABASE);
            return r == 0 ? "ok" : "error:ccd-set:" + r;
        }
        finally { Marshal.FreeHGlobal(p); Marshal.FreeHGlobal(m); }
    }

    public static string Run(string cmd, string arg)
    {
        if (cmd == "ccdsave") return CcdSave();
        if (cmd == "ccdrestore") return CcdRestore(arg);
        // Like Win+P > Extend: every connected monitor on, in Windows' remembered arrangement.
        if (cmd == "extend") { int r = SetDisplayConfig(0, IntPtr.Zero, 0, IntPtr.Zero, SDC_APPLY | SDC_TOPOLOGY_EXTEND); return r == 0 ? "ok" : "error:extend:" + r; }
        var cur = List();
        if (cmd == "list") return ToJson(cur);
        if (cmd == "restore") return Apply(Parse(arg), List());
        if (cmd == "modes")
        {
            // Every resolution the monitor (driver) offers, best refresh rate per size, biggest first.
            var best = new Dictionary<long, int[]>();
            var dm = NewDm();
            // A switched-off monitor lists modes in its output's remembered rotation: report them unrotated.
            var me = cur.Find(m => m.name == arg);
            bool off = me == null || !me.attached;
            // Raw modes too, so custom resolutions made in the GPU control panel are listed.
            for (int k = 0; EnumDisplaySettingsEx(arg, k, ref dm, EDS_RAWMODE); k++)
            {
                if (dm.dmBitsPerPel != 0 && dm.dmBitsPerPel < 32) continue;
                bool rot = off && (dm.dmDisplayOrientation == 1 || dm.dmDisplayOrientation == 3);
                int w = rot ? dm.dmPelsHeight : dm.dmPelsWidth, h = rot ? dm.dmPelsWidth : dm.dmPelsHeight;
                long key = (long)w * 100000 + h;
                int[] v;
                if (!best.TryGetValue(key, out v) || dm.dmDisplayFrequency > v[2]) best[key] = new[] { w, h, dm.dmDisplayFrequency };
            }
            var all = new List<int[]>(best.Values);
            all.Sort((a, b) => (b[0] * b[1]).CompareTo(a[0] * a[1]));
            var sb = new StringBuilder("[");
            for (int i = 0; i < all.Count; i++) sb.Append(i > 0 ? "," : "").Append('[').Append(all[i][0]).Append(',').Append(all[i][1]).Append(',').Append(all[i][2]).Append(']');
            return sb.Append(']').ToString();
        }
        var t = cur.Find(m => m.name == arg);
        if (t == null) return "error:unknown-monitor";
        if (cmd == "primary")
        {
            if (!t.attached)
            {
                // Switch it on at its best mode as the new primary at 0,0; the others move to its right.
                if (t.bw == 0) return "error:no-mode";
                int minX = int.MaxValue, minY = 0;
                foreach (var m in cur) if (m.attached && m.x < minX) { minX = m.x; minY = m.y; }
                foreach (var m in cur) if (m.attached && m != t) { m.x = m.x - minX + t.bw; m.y = m.y - minY; }
                t.attached = true; t.x = 0; t.y = 0; t.w = t.bw; t.h = t.bh; t.hz = t.bhz; t.or = 0; // unrotated
            }
            else
            {
                int dx = t.x, dy = t.y;
                foreach (var m in cur) if (m.attached) { m.x -= dx; m.y -= dy; }
            }
            foreach (var m in cur) m.primary = m == t;
            return Apply(cur, List());
        }
        if (cmd == "only")
        {
            if (!t.attached) { t.w = t.bw; t.h = t.bh; t.hz = t.bhz; t.or = 0; } // switched on unrotated
            if (t.w == 0 || t.h == 0) return "error:no-mode";
            foreach (var m in cur) { m.primary = m == t; m.attached = m == t; }
            t.x = 0; t.y = 0;
            return Apply(cur, List());
        }
        return "error:unknown-command";
    }
}
