// SwapDeck audio helper: list playback devices and set the Windows default one. Compiled once by
// PowerShell (Add-Type) into a DLL in SwapDeck's app data, like the display helper.
// Uses the Core Audio API (IMMDeviceEnumerator) and the IPolicyConfig interface that Windows' own
// Sound settings use to change the default device. Written for the C# 5 compiler in Windows PowerShell.
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class SDAudio
{
    const int eRender = 0, DEVICE_STATE_ACTIVE = 1;

    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator { }
    [ComImport, Guid("870af99c-171d-4f9e-af0d-e63df40c2bc9")] class PolicyConfigClient { }

    [StructLayout(LayoutKind.Sequential)]
    struct PROPERTYKEY { public Guid fmtid; public int pid; }

    [StructLayout(LayoutKind.Explicit, Size = 24)]
    struct PROPVARIANT { [FieldOffset(0)] public short vt; [FieldOffset(8)] public IntPtr p; }

    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDeviceEnumerator
    {
        int EnumAudioEndpoints(int dataFlow, int stateMask, out IMMDeviceCollection devices);
        int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
    }

    [Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDeviceCollection
    {
        int GetCount(out int count);
        int Item(int index, out IMMDevice device);
    }

    [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDevice
    {
        int Activate(ref Guid iid, int ctx, IntPtr p, [MarshalAs(UnmanagedType.IUnknown)] out object o);
        int OpenPropertyStore(int access, out IPropertyStore props);
        int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
        int GetState(out int state);
    }

    [Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IPropertyStore
    {
        int GetCount(out int count);
        int GetAt(int i, out PROPERTYKEY key);
        int GetValue(ref PROPERTYKEY key, out PROPVARIANT value);
    }

    // Only SetDefaultEndpoint is used; the methods before it must still be declared in order.
    [Guid("f8679f50-850a-41cf-9c72-430f290290c8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IPolicyConfig
    {
        int GetMixFormat(string id, IntPtr fmt);
        int GetDeviceFormat(string id, int def, IntPtr fmt);
        int ResetDeviceFormat(string id);
        int SetDeviceFormat(string id, IntPtr fmt, IntPtr mix);
        int GetProcessingPeriod(string id, int def, IntPtr a, IntPtr b);
        int SetProcessingPeriod(string id, IntPtr p);
        int GetShareMode(string id, IntPtr mode);
        int SetShareMode(string id, IntPtr mode);
        int GetPropertyValue(string id, IntPtr key, IntPtr pv);
        int SetPropertyValue(string id, IntPtr key, IntPtr pv);
        int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string id, int role);
    }

    static string Name(IMMDevice d)
    {
        try
        {
            IPropertyStore ps;
            d.OpenPropertyStore(0, out ps);
            var key = new PROPERTYKEY { fmtid = new Guid("a45c254e-df1c-4efd-8020-67d146a850e0"), pid = 14 }; // PKEY_Device_FriendlyName
            PROPVARIANT v;
            ps.GetValue(ref key, out v);
            return v.vt == 31 ? Marshal.PtrToStringUni(v.p) : "";
        }
        catch { return ""; }
    }

    static string J(string s) { return "\"" + (s ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"") + "\""; }

    public static string Run(string cmd, string arg)
    {
        var en = (IMMDeviceEnumerator)new MMDeviceEnumerator();
        if (cmd == "list")
        {
            string def = "";
            IMMDevice dd;
            if (en.GetDefaultAudioEndpoint(eRender, 1, out dd) == 0 && dd != null) dd.GetId(out def);
            IMMDeviceCollection col;
            en.EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE, out col);
            int n; col.GetCount(out n);
            var sb = new StringBuilder("[");
            for (int i = 0; i < n; i++)
            {
                IMMDevice d; col.Item(i, out d);
                string id; d.GetId(out id);
                if (i > 0) sb.Append(',');
                sb.Append("{\"id\":").Append(J(id)).Append(",\"name\":").Append(J(Name(d))).Append(",\"def\":").Append(id == def ? "true" : "false").Append('}');
            }
            return sb.Append(']').ToString();
        }
        if (cmd == "defaults")
        {
            // The default device for each role: console (0), multimedia (1), communications (2).
            var sb = new StringBuilder("{");
            string[] names = { "console", "multimedia", "comms" };
            for (int role = 0; role < 3; role++)
            {
                string id = ""; IMMDevice d;
                if (en.GetDefaultAudioEndpoint(eRender, role, out d) == 0 && d != null) d.GetId(out id);
                sb.Append(role > 0 ? "," : "").Append(J(names[role])).Append(':').Append(J(id));
            }
            return sb.Append('}').ToString();
        }
        if (cmd == "set")
        {
            // arg = "<roles>|<device id>", roles like "01" (console + multimedia). Games play through those two;
            // the communications device (voice chat) is left alone.
            int bar = arg.IndexOf('|');
            string roles = bar > 0 ? arg.Substring(0, bar) : "01", id = bar > 0 ? arg.Substring(bar + 1) : arg;
            var pc = (IPolicyConfig)new PolicyConfigClient();
            foreach (char c in roles)
            {
                int hr = pc.SetDefaultEndpoint(id, c - '0');
                if (hr != 0) return "error:" + hr;
            }
            return "ok";
        }
        return "error:unknown-command";
    }
}
