// SwapDeck display helper: list monitors, make one primary (switching it on if needed),
// use only one, and restore a saved layout. Compiled once by PowerShell (Add-Type) into a DLL in
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
    const int DM_POSITION = 0x20, DM_W = 0x80000, DM_H = 0x100000, DM_HZ = 0x400000;
    const uint CDS_UPDATEREGISTRY = 0x1, CDS_SET_PRIMARY = 0x10, CDS_NORESET = 0x10000000;
    const uint EDD_GET_DEVICE_INTERFACE_NAME = 0x1;

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

    class Mon
    {
        public string name = "", monitor = "", hwid = "";
        public bool attached, primary;
        public int x, y, w, h, hz;   // current (or registry) mode
        public int bw, bh, bhz;      // best available mode, used when switching a monitor on
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
                monitor = EdidName(md.DeviceID),
                attached = (dd.StateFlags & ATTACHED) != 0,
                primary = (dd.StateFlags & PRIMARY) != 0
            };
            var bm = NewDm();
            for (int k = 0; EnumDisplaySettingsEx(dd.DeviceName, k, ref bm, 0); k++)
            {
                bool bigger = (long)bm.dmPelsWidth * bm.dmPelsHeight > (long)m.bw * m.bh;
                bool faster = bm.dmPelsWidth == m.bw && bm.dmPelsHeight == m.bh && bm.dmDisplayFrequency > m.bhz;
                if (bigger || faster) { m.bw = bm.dmPelsWidth; m.bh = bm.dmPelsHeight; m.bhz = bm.dmDisplayFrequency; }
            }
            var dm = NewDm();
            if (EnumDisplaySettingsEx(dd.DeviceName, m.attached ? ENUM_CURRENT : ENUM_REGISTRY, ref dm, 0))
            { m.x = dm.dmPositionX; m.y = dm.dmPositionY; m.w = dm.dmPelsWidth; m.h = dm.dmPelsHeight; m.hz = dm.dmDisplayFrequency; }
            list.Add(m);
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
            sb.Append("{\"name\":").Append(J(m.name)).Append(",\"monitor\":").Append(J(m.monitor)).Append(",\"hwid\":").Append(J(m.hwid))
              .Append(",\"attached\":").Append(m.attached ? "true" : "false").Append(",\"primary\":").Append(m.primary ? "true" : "false")
              .Append(",\"x\":").Append(m.x).Append(",\"y\":").Append(m.y).Append(",\"w\":").Append(m.w).Append(",\"h\":").Append(m.h)
              .Append(",\"hz\":").Append(m.hz).Append(",\"bw\":").Append(m.bw).Append(",\"bh\":").Append(m.bh).Append(",\"bhz\":").Append(m.bhz)
              .Append('}');
        }
        return sb.Append(']').ToString();
    }

    // Saved layout format: name|attached|primary|x|y|w|h|hz;...
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
                x = int.Parse(f[3], ci), y = int.Parse(f[4], ci), w = int.Parse(f[5], ci), h = int.Parse(f[6], ci), hz = int.Parse(f[7], ci)
            });
        }
        return list;
    }

    public static string Run(string cmd, string arg)
    {
        var cur = List();
        if (cmd == "list") return ToJson(cur);
        if (cmd == "restore") return Apply(Parse(arg), List());
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
                t.attached = true; t.x = 0; t.y = 0; t.w = t.bw; t.h = t.bh; t.hz = t.bhz;
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
            if (!t.attached) { t.w = t.bw; t.h = t.bh; t.hz = t.bhz; }
            if (t.w == 0 || t.h == 0) return "error:no-mode";
            foreach (var m in cur) { m.primary = m == t; m.attached = m == t; }
            t.x = 0; t.y = 0;
            return Apply(cur, List());
        }
        return "error:unknown-command";
    }
}
