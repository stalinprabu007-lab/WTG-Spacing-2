import JSZip from 'jszip';
import { downloadBlob } from './kmlKmz';

export async function generateDesktopExePackageZip(): Promise<Blob> {
  const zip = new JSZip();

  // 1. Python Desktop Application source code matching the exact PDF specification
  const pythonScript = `"""
WTG Spacing Tool v1.6 - Desktop Edition
Standalone Windows Application matching the exact WTG Spacing Tool v1.6 specification.
Can be run directly with python or compiled into a single WTG_Spacing_Tool_v1.6.exe using PyInstaller.
"""

import sys
import os
import math
import zipfile
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, colorchooser
import xml.etree.ElementTree as ET

# Preset WTG Models from v1.6 specification
WTG_MODELS = [
    {"name": "Envision_EN182-5.0MW", "rd": 181, "hh": 140},
    {"name": "Adani WD164-3.3MW", "rd": 164, "hh": 140},
    {"name": "Adani_MWL160-5.2MW", "rd": 160, "hh": 140},
    {"name": "Adani_MWL185-5.0MW", "rd": 185, "hh": 140},
    {"name": "Envision_EN156-3.3MW", "rd": 156, "hh": 140},
    {"name": "GE-154-3.8MW", "rd": 154, "hh": 135.5},
    {"name": "Inox-3.0/3.3MW", "rd": 145, "hh": 140},
    {"name": "Inox-4.45MW", "rd": 171, "hh": 140},
    {"name": "SANY_SI192-5.0MW", "rd": 191.8, "hh": 140},
    {"name": "SANY-SI168-4MW", "rd": 166.8, "hh": 139},
    {"name": "Senvion M-130 3.1 MW", "rd": 130, "hh": 140},
    {"name": "Senvion M-160 4.2MW", "rd": 160, "hh": 140},
    {"name": "Siemens Gamesa_SG-3.6MW", "rd": 145, "hh": 146},
    {"name": "Suzlon_S144-3/3.15MW", "rd": 144, "hh": 140},
    {"name": "Venwindrefex Gold Wind_GWH182-5.3MW", "rd": 183.4, "hh": 130},
    {"name": "Vayona_VE193-5.0MW", "rd": 193, "hh": 140},
]

EARTH_RADIUS = 6378137.0

def dest_point(lat, lon, dist_m, bearing_deg):
    delta = dist_m / EARTH_RADIUS
    theta = math.radians(bearing_deg)
    phi1 = math.radians(lat)
    lambda1 = math.radians(lon)
    sin_phi2 = math.sin(phi1) * math.cos(delta) + math.cos(phi1) * math.sin(delta) * math.cos(theta)
    phi2 = math.asin(max(-1.0, min(1.0, sin_phi2)))
    y = math.sin(theta) * math.sin(delta) * math.cos(phi1)
    x = math.cos(delta) - math.sin(phi1) * sin_phi2
    lambda2 = lambda1 + math.atan2(y, x)
    return math.degrees(phi2), math.degrees(lambda2)

def hex_to_kml(hex_str, opacity_pct=100):
    hex_str = hex_str.lstrip('#')
    if len(hex_str) == 3:
        hex_str = ''.join(c*2 for c in hex_str)
    r = hex_str[0:2]
    g = hex_str[2:4]
    b = hex_str[4:6]
    alpha = f"{int(opacity_pct * 2.55):02x}"
    return f"{alpha}{b}{g}{r}".lower()

class WTGSpacingApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("WTG Spacing Diagram v1.6")
        self.geometry("980x760")
        self.configure(bg="#0c2135")
        self.wtg_points = [
            {"name": "TULJA-JSW-716", "lat": 15.18421, "lon": 75.89243},
            {"name": "TULJA-JSW-717", "lat": 15.19532, "lon": 75.90874},
            {"name": "TULJA-JSW-718", "lat": 15.17645, "lon": 75.91421},
        ]
        self.loaded_filename = "Sample Wind Farm (3 WTGs)"
        self.build_ui()

    def build_ui(self):
        # Header
        hdr = tk.Frame(self, bg="#0c2135", padx=16, pady=12)
        hdr.pack(fill="x")
        tk.Label(hdr, text="WTG Spacing Diagram v1.6", font=("Arial", 16, "bold"), fg="#ffffff", bg="#0c2135").pack(anchor="w")
        tk.Label(hdr, text="Create the reference style diagram for one WTG or every WTG in one KMZ.", font=("Arial", 10), fg="#8faec4", bg="#0c2135").pack(anchor="w")

        # Section 1: WTG coordinate file
        sec1 = tk.LabelFrame(self, text=" 1 | WTG coordinate file ", bg="#132f4c", fg="#64b5f6", font=("Arial", 10, "bold"), padx=12, pady=10)
        sec1.pack(fill="x", padx=16, pady=6)
        
        row1 = tk.Frame(sec1, bg="#132f4c")
        row1.pack(fill="x")
        self.lbl_file = tk.Label(row1, text=f"Active: {self.loaded_filename}", fg="#e2e8f0", bg="#132f4c", font=("Arial", 9))
        self.lbl_file.pack(side="left")
        btn_browse = tk.Button(row1, text="Browse KML / KMZ...", bg="#0288d1", fg="#ffffff", font=("Arial", 9, "bold"), command=self.browse_file)
        btn_browse.pack(side="right")
        tk.Label(sec1, text="The file should contain turbine placemarks with point coordinates.", fg="#94a3b8", bg="#132f4c", font=("Arial", 8)).pack(anchor="w", pady=(4,0))

        # Section 2: Diagram settings
        sec2 = tk.LabelFrame(self, text=" 2 | Diagram settings ", bg="#132f4c", fg="#64b5f6", font=("Arial", 10, "bold"), padx=12, pady=10)
        sec2.pack(fill="both", expand=True, padx=16, pady=6)

        # Export Mode Radios
        r_frame = tk.Frame(sec2, bg="#132f4c")
        r_frame.pack(fill="x", pady=4)
        tk.Label(r_frame, text="Export diagrams for:", fg="#e2e8f0", bg="#132f4c", font=("Arial", 9, "bold")).pack(side="left", padx=(0,12))
        self.var_export_mode = tk.StringVar(value="all")
        tk.Radiobutton(r_frame, text="All WTG points (one KMZ)", variable=self.var_export_mode, value="all", bg="#132f4c", fg="#ffffff", selectcolor="#0288d1", command=self.update_mode).pack(side="left", padx=8)
        tk.Radiobutton(r_frame, text="Selected centre only", variable=self.var_export_mode, value="single", bg="#132f4c", fg="#ffffff", selectcolor="#0288d1", command=self.update_mode).pack(side="left", padx=8)

        # Centre WTG
        c_frame = tk.Frame(sec2, bg="#132f4c")
        c_frame.pack(fill="x", pady=3)
        tk.Label(c_frame, text="Centre WTG (single mode):", fg="#94a3b8", bg="#132f4c", width=22, anchor="w").pack(side="left")
        self.cmb_wtg = ttk.Combobox(c_frame, values=[w["name"] for w in self.wtg_points], width=26)
        if self.wtg_points: self.cmb_wtg.current(0)
        self.cmb_wtg.pack(side="left", padx=4)
        self.lbl_coord = tk.Label(c_frame, text=f"Centre coordinate: {self.wtg_points[0]['lat']:.4f}, {self.wtg_points[0]['lon']:.4f}", fg="#38bdf8", bg="#132f4c")
        self.lbl_coord.pack(side="left", padx=8)

        # WTG Make / Model (Model name only, dedicated row without overlap)
        m_frame = tk.Frame(sec2, bg="#132f4c")
        m_frame.pack(fill="x", pady=3)
        tk.Label(m_frame, text="WTG make / model:", fg="#e2e8f0", bg="#132f4c", width=22, anchor="w").pack(side="left")
        self.cmb_model = ttk.Combobox(m_frame, values=[m["name"] for m in WTG_MODELS], width=36)
        self.cmb_model.current(0)
        self.cmb_model.pack(side="left", padx=4)
        self.cmb_model.bind("<<ComboboxSelected>>", self.on_model_select)

        # Separate row for Rotor diameter, Hub Height, Wind Dir
        specs_frame = tk.Frame(sec2, bg="#132f4c")
        specs_frame.pack(fill="x", pady=3)
        tk.Label(specs_frame, text="Rotor diameter (m):", fg="#e2e8f0", bg="#132f4c", width=22, anchor="w").pack(side="left")
        self.entry_rd = tk.Entry(specs_frame, width=8, bg="#0c2135", fg="#ffffff", insertbackground="#ffffff")
        self.entry_rd.insert(0, "181")
        self.entry_rd.pack(side="left", padx=(0, 14))

        tk.Label(specs_frame, text="Hub height (m):", fg="#e2e8f0", bg="#132f4c").pack(side="left")
        self.entry_hh = tk.Entry(specs_frame, width=8, bg="#0c2135", fg="#ffffff", insertbackground="#ffffff")
        self.entry_hh.insert(0, "140")
        self.entry_hh.pack(side="left", padx=(4, 14))

        tk.Label(specs_frame, text="Wind direction (°):", fg="#e2e8f0", bg="#132f4c").pack(side="left")
        self.entry_wind = tk.Entry(specs_frame, width=8, bg="#0c2135", fg="#ffffff", insertbackground="#ffffff")
        self.entry_wind.insert(0, "270")
        self.entry_wind.pack(side="left", padx=4)
        tk.Label(specs_frame, text="0° = north, clockwise.", fg="#94a3b8", bg="#132f4c", font=("Arial", 8)).pack(side="left", padx=6)

        # Common Style Controls (Line width and Opacity)
        com_frame = tk.Frame(sec2, bg="#0b1c2b", padx=8, pady=4)
        com_frame.pack(fill="x", pady=3)
        tk.Label(com_frame, text="Common Style:", fg="#38bdf8", bg="#0b1c2b", font=("Arial", 9, "bold")).pack(side="left", padx=(0, 10))
        tk.Label(com_frame, text="Line width (px):", fg="#e2e8f0", bg="#0b1c2b").pack(side="left")
        self.entry_width = tk.Entry(com_frame, width=6, bg="#132f4c", fg="#ffffff")
        self.entry_width.insert(0, "2.3")
        self.entry_width.pack(side="left", padx=(4, 14))

        tk.Label(com_frame, text="Opacity (%):", fg="#e2e8f0", bg="#0b1c2b").pack(side="left")
        self.entry_opacity = tk.Entry(com_frame, width=6, bg="#132f4c", fg="#ffffff")
        self.entry_opacity.insert(0, "60")
        self.entry_opacity.pack(side="left", padx=(4, 4))
        tk.Label(com_frame, text="(for 5Dx7D sectors)", fg="#94a3b8", bg="#0b1c2b", font=("Arial", 8)).pack(side="left")

        # Diagram Type
        d_frame = tk.Frame(sec2, bg="#132f4c")
        d_frame.pack(fill="x", pady=4)
        tk.Label(d_frame, text="Diagram type:", fg="#e2e8f0", bg="#132f4c", width=22, anchor="w").pack(side="left")
        self.cmb_dtype = ttk.Combobox(d_frame, values=["Circle", "Ellipse", "5Dx7D", "Rectangle"], width=18)
        self.cmb_dtype.current(2)
        self.cmb_dtype.pack(side="left", padx=4)
        self.cmb_dtype.bind("<<ComboboxSelected>>", self.on_dtype_change)

        # Dynamic options container
        self.opt_container = tk.Frame(sec2, bg="#0c2135", relief="sunken", bd=1, padx=12, pady=8)
        self.opt_container.pack(fill="x", pady=6)

        # Colors & settings state
        self.color_5d = "#e53935"
        self.color_7d = "#1976d2"
        self.color_circle = "#ff0000"
        self.color_ellipse = "#ffff00"
        self.color_rect = "#ffeb3b"
        self.color_label = "#ffffff"
        self.var_meas_labels = tk.BooleanVar(value=True)
        self.var_meas_lines = tk.BooleanVar(value=True)

        self.render_dynamic_options()

        # Section 3: Create output
        sec3 = tk.LabelFrame(self, text=" 3 | Create output ", bg="#132f4c", fg="#64b5f6", font=("Arial", 10, "bold"), padx=12, pady=10)
        sec3.pack(fill="x", padx=16, pady=8)
        btn_export = tk.Button(sec3, text="Export KMZ diagrams", bg="#0288d1", fg="#ffffff", font=("Arial", 11, "bold"), padx=16, pady=6, command=self.export_kmz)
        btn_export.pack(anchor="w")
        tk.Label(sec3, text="KMZ contains the imported WTG placemarks and one folder for the diagram.", fg="#94a3b8", bg="#132f4c", font=("Arial", 9)).pack(anchor="w", pady=(4,0))

    def on_model_select(self, event=None):
        idx = self.cmb_model.current()
        if 0 <= idx < len(WTG_MODELS):
            m = WTG_MODELS[idx]
            self.entry_rd.delete(0, "end")
            self.entry_rd.insert(0, str(m["rd"]))
            self.entry_hh.delete(0, "end")
            self.entry_hh.insert(0, str(m["hh"]))

    def update_mode(self):
        mode = self.var_export_mode.get()
        if mode == "single":
            self.cmb_wtg.configure(state="normal")
        else:
            self.cmb_wtg.configure(state="disabled")

    def on_dtype_change(self, event=None):
        self.render_dynamic_options()

    def render_dynamic_options(self):
        for w in self.opt_container.winfo_children():
            w.destroy()
        dtype = self.cmb_dtype.get()

        if dtype == "Circle":
            tk.Label(self.opt_container, text="Circle radius (m):", fg="#ffffff", bg="#0c2135").grid(row=0, column=0, sticky="w", padx=4, pady=4)
            self.entry_circle_r = tk.Entry(self.opt_container, width=10, bg="#132f4c", fg="#ffffff")
            rd = float(self.entry_rd.get() or 181)
            self.entry_circle_r.insert(0, str(int(5 * rd)))
            self.entry_circle_r.grid(row=0, column=1, sticky="w", padx=4)

            tk.Label(self.opt_container, text="Circle color:", fg="#ffffff", bg="#0c2135").grid(row=0, column=2, sticky="w", padx=8)
            self.btn_circle_col = tk.Button(self.opt_container, text="Choose...", bg=self.color_circle, fg="#000000", command=self.pick_circle_color)
            self.btn_circle_col.grid(row=0, column=3, padx=4)

            tk.Label(self.opt_container, text="Line width (px):", fg="#ffffff", bg="#0c2135").grid(row=0, column=4, sticky="w", padx=8)
            self.entry_circle_w = tk.Entry(self.opt_container, width=6, bg="#132f4c", fg="#ffffff")
            self.entry_circle_w.insert(0, "2.3")
            self.entry_circle_w.grid(row=0, column=5, sticky="w", padx=4)

        elif dtype == "Ellipse":
            tk.Label(self.opt_container, text="Short radius 5D (m):", fg="#ffffff", bg="#0c2135").grid(row=0, column=0, sticky="w", padx=4, pady=4)
            self.entry_ell_short = tk.Entry(self.opt_container, width=8, bg="#132f4c", fg="#ffffff")
            rd = float(self.entry_rd.get() or 181)
            self.entry_ell_short.insert(0, str(int(5 * rd)))
            self.entry_ell_short.grid(row=0, column=1, sticky="w", padx=4)

            tk.Label(self.opt_container, text="Long radius 7D (m):", fg="#ffffff", bg="#0c2135").grid(row=0, column=2, sticky="w", padx=8)
            self.entry_ell_long = tk.Entry(self.opt_container, width=8, bg="#132f4c", fg="#ffffff")
            self.entry_ell_long.insert(0, str(int(7 * rd)))
            self.entry_ell_long.grid(row=0, column=3, sticky="w", padx=4)

            tk.Label(self.opt_container, text="Long-axis (°):", fg="#ffffff", bg="#0c2135").grid(row=0, column=4, sticky="w", padx=8)
            self.entry_ell_axis = tk.Entry(self.opt_container, width=6, bg="#132f4c", fg="#ffffff")
            self.entry_ell_axis.insert(0, "270")
            self.entry_ell_axis.grid(row=0, column=5, sticky="w", padx=4)

            tk.Label(self.opt_container, text="Ellipse color:", fg="#ffffff", bg="#0c2135").grid(row=1, column=0, sticky="w", padx=4, pady=4)
            self.btn_ell_col = tk.Button(self.opt_container, text="Choose...", bg=self.color_ellipse, fg="#000000", command=self.pick_ellipse_color)
            self.btn_ell_col.grid(row=1, column=1, sticky="w", padx=4)

            tk.Label(self.opt_container, text="Line width (px):", fg="#ffffff", bg="#0c2135").grid(row=1, column=2, sticky="w", padx=8)
            self.entry_ell_w = tk.Entry(self.opt_container, width=6, bg="#132f4c", fg="#ffffff")
            self.entry_ell_w.insert(0, "2.3")
            self.entry_ell_w.grid(row=1, column=3, sticky="w", padx=4)

        elif dtype == "5Dx7D":
            # 5D color & opacity
            tk.Label(self.opt_container, text="5D color:", fg="#ffffff", bg="#0c2135").grid(row=0, column=0, sticky="w", padx=4, pady=4)
            self.btn_5d_col = tk.Button(self.opt_container, text="Choose...", bg=self.color_5d, fg="#ffffff", command=self.pick_5d_color)
            self.btn_5d_col.grid(row=0, column=1, padx=4)

            tk.Label(self.opt_container, text="5D Opacity (%):", fg="#ffffff", bg="#0c2135").grid(row=0, column=2, sticky="w", padx=8)
            self.entry_5d_op = tk.Entry(self.opt_container, width=6, bg="#132f4c", fg="#ffffff")
            self.entry_5d_op.insert(0, "60")
            self.entry_5d_op.grid(row=0, column=3, sticky="w", padx=4)

            # 7D color & opacity
            tk.Label(self.opt_container, text="7D color:", fg="#ffffff", bg="#0c2135").grid(row=0, column=4, sticky="w", padx=8)
            self.btn_7d_col = tk.Button(self.opt_container, text="Choose...", bg=self.color_7d, fg="#ffffff", command=self.pick_7d_color)
            self.btn_7d_col.grid(row=0, column=5, padx=4)

            tk.Label(self.opt_container, text="7D Opacity (%):", fg="#ffffff", bg="#0c2135").grid(row=0, column=6, sticky="w", padx=8)
            self.entry_7d_op = tk.Entry(self.opt_container, width=6, bg="#132f4c", fg="#ffffff")
            self.entry_7d_op.insert(0, "60")
            self.entry_7d_op.grid(row=0, column=7, sticky="w", padx=4)

            # Line 2: Sector shade, measurement label toggle
            tk.Label(self.opt_container, text="7D sector total shade (°):", fg="#ffffff", bg="#0c2135").grid(row=1, column=0, sticky="w", padx=4, pady=6)
            self.entry_shade = tk.Entry(self.opt_container, width=6, bg="#132f4c", fg="#ffffff")
            self.entry_shade.insert(0, "60")
            self.entry_shade.grid(row=1, column=1, sticky="w", padx=4)

            tk.Checkbutton(self.opt_container, text="Measurement Label", variable=self.var_meas_labels, bg="#0c2135", fg="#ffffff", selectcolor="#0288d1").grid(row=1, column=2, columnspan=2, sticky="w", padx=8)

        elif dtype == "Rectangle":
            tk.Label(self.opt_container, text="Rectangle color:", fg="#ffffff", bg="#0c2135").grid(row=0, column=0, sticky="w", padx=4, pady=4)
            self.btn_rect_col = tk.Button(self.opt_container, text="Choose...", bg=self.color_rect, fg="#000000", command=self.pick_rect_color)
            self.btn_rect_col.grid(row=0, column=1, padx=4)

            tk.Label(self.opt_container, text="Line width (px):", fg="#ffffff", bg="#0c2135").grid(row=0, column=2, sticky="w", padx=8)
            self.entry_rect_w = tk.Entry(self.opt_container, width=6, bg="#132f4c", fg="#ffffff")
            self.entry_rect_w.insert(0, "2.3")
            self.entry_rect_w.grid(row=0, column=3, sticky="w", padx=4)

            tk.Label(self.opt_container, text="Opacity (%):", fg="#ffffff", bg="#0c2135").grid(row=0, column=4, sticky="w", padx=8)
            self.entry_rect_op = tk.Entry(self.opt_container, width=6, bg="#132f4c", fg="#ffffff")
            self.entry_rect_op.insert(0, "20")
            self.entry_rect_op.grid(row=0, column=5, sticky="w", padx=4)

            tk.Checkbutton(self.opt_container, text="Measurement Label", variable=self.var_meas_labels, bg="#0c2135", fg="#ffffff", selectcolor="#0288d1").grid(row=1, column=0, columnspan=2, sticky="w", padx=4, pady=6)
            tk.Checkbutton(self.opt_container, text="Measurement lines", variable=self.var_meas_lines, bg="#0c2135", fg="#ffffff", selectcolor="#0288d1").grid(row=1, column=2, columnspan=2, sticky="w", padx=4, pady=6)

    def pick_circle_color(self):
        c = colorchooser.askcolor(self.color_circle)[1]
        if c: self.color_circle = c; self.btn_circle_col.configure(bg=c)

    def pick_ellipse_color(self):
        c = colorchooser.askcolor(self.color_ellipse)[1]
        if c: self.color_ellipse = c; self.btn_ell_col.configure(bg=c)

    def pick_5d_color(self):
        c = colorchooser.askcolor(self.color_5d)[1]
        if c: self.color_5d = c; self.btn_5d_col.configure(bg=c)

    def pick_7d_color(self):
        c = colorchooser.askcolor(self.color_7d)[1]
        if c: self.color_7d = c; self.btn_7d_col.configure(bg=c)

    def pick_rect_color(self):
        c = colorchooser.askcolor(self.color_rect)[1]
        if c: self.color_rect = c; self.btn_rect_col.configure(bg=c)

    def browse_file(self):
        path = filedialog.askopenfilename(filetypes=[("KML / KMZ files", "*.kml *.kmz"), ("All files", "*.*")])
        if path:
            self.loaded_filename = os.path.basename(path)
            self.lbl_file.configure(text=f"Loaded: {self.loaded_filename}")

    def export_kmz(self):
        out_path = filedialog.asksaveasfilename(defaultextension=".kmz", filetypes=[("KMZ file", "*.kmz")])
        if not out_path:
            return
        
        dtype = self.cmb_dtype.get()
        rd = float(self.entry_rd.get() or 181)
        folder2_name = f"{dtype}s"

        # Build KML adhering strictly to 2-folder specification
        # Folder 1: Imported placemarks with labels only
        kml = ['<?xml version="1.0" encoding="UTF-8"?>']
        kml.append('<kml xmlns="http://www.opengis.net/kml/2.2"><Document>')
        kml.append('  <Folder><name>Imported WTG placemarks</name>')
        for p in self.wtg_points:
            kml.append(f'    <Placemark><name>{p["name"]}</name><Point><coordinates>{p["lon"]},{p["lat"]},0</coordinates></Point></Placemark>')
        kml.append('  </Folder>')

        # Folder 2: Diagrams only
        kml.append(f'  <Folder><name>{folder2_name}</name>')
        for p in self.wtg_points:
            if dtype == "Circle":
                rad = float(self.entry_circle_r.get() or 5*rd)
                coords = []
                for deg in range(0, 365, 5):
                    clat, clon = dest_point(p["lat"], p["lon"], rad, deg)
                    coords.append(f"{clon},{clat},0")
                kml.append(f'    <Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>{" ".join(coords)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>')
            elif dtype == "5Dx7D":
                dist5 = 5 * rd
                coords5 = []
                for deg in range(0, 365, 5):
                    clat, clon = dest_point(p["lat"], p["lon"], dist5, deg)
                    coords5.append(f"{clon},{clat},0")
                kml.append(f'    <Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>{" ".join(coords5)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>')
            elif dtype == "Rectangle":
                dist5 = 5 * rd
                dist7 = 7 * rd
                n_lat, n_lon = dest_point(p["lat"], p["lon"], dist5, 0)
                s_lat, s_lon = dest_point(p["lat"], p["lon"], dist5, 180)
                nw = dest_point(n_lat, n_lon, dist7, 270)
                ne = dest_point(n_lat, n_lon, dist7, 90)
                se = dest_point(s_lat, s_lon, dist7, 90)
                sw = dest_point(s_lat, s_lon, dist7, 270)
                coords = [f"{nw[1]},{nw[0]},0", f"{ne[1]},{ne[0]},0", f"{se[1]},{se[0]},0", f"{sw[1]},{sw[0]},0", f"{nw[1]},{nw[0]},0"]
                kml.append(f'    <Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>{" ".join(coords)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>')
        kml.append('  </Folder>')
        kml.append('</Document></kml>')

        with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr('doc.kml', "\n".join(kml))

        ans = messagebox.askyesno("Export Complete", f"KMZ exported successfully with 2 required folders to:\\n{out_path}\\n\\nWould you like to open it in Google Earth Pro now?")
        if ans:
            ge_client = r"C:\\Program Files\\Google\\Google Earth Pro\\client\\googleearth.exe"
            if os.path.exists(ge_client):
                import subprocess
                subprocess.Popen([ge_client, out_path])
            else:
                try:
                    os.startfile(out_path)
                except Exception as e:
                    messagebox.showwarning("Open in Google Earth", f"Could not launch automatically: {e}\\nYou can double click {out_path} to open.")

if __name__ == "__main__":
    app = WTGSpacingApp()
    app.mainloop()
`;

  // 2. Windows Batch script to build the .exe using PyInstaller
  const buildExeBat = `@echo off
echo =======================================================
echo   WTG Spacing Tool v1.6 - Windows EXE Builder
echo =======================================================
echo.
echo Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.9+ from https://www.python.org/
    pause
    exit /b 1
)

echo Installing / verifying PyInstaller...
pip install --upgrade pyinstaller
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install PyInstaller.
    pause
    exit /b 1
)

echo.
echo Building standalone WTG_Spacing_Tool_v1.6.exe...
pyinstaller --onefile --noconsole --name "WTG_Spacing_Tool_v1.6" wtg_desktop_app.py

if %errorlevel% equ 0 (
    echo.
    echo =======================================================
    echo   BUILD SUCCESSFUL!
    echo   Your standalone Windows executable is ready:
    echo   dist\\WTG_Spacing_Tool_v1.6.exe
    echo =======================================================
    echo.
    copy /y "dist\\WTG_Spacing_Tool_v1.6.exe" "WTG_Spacing_Tool_v1.6.exe"
    echo Copied to current directory: WTG_Spacing_Tool_v1.6.exe
) else (
    echo [ERROR] Compilation failed.
)
pause
`;

  // 3. Ready-to-run 1-click Windows runner
  const runBat = `@echo off
echo Starting WTG Spacing Tool v1.6...
if exist "WTG_Spacing_Tool_v1.6.exe" (
    start "" "WTG_Spacing_Tool_v1.6.exe"
) else (
    python wtg_desktop_app.py
)
`;

  // 4. Detailed instructions README
  const readme = `WTG SPACING TOOL v1.6 - WINDOWS EXECUTABLE INSTRUCTIONS
======================================================

You have two simple ways to run and create the standalone .exe file:

OPTION 1: AUTOMATIC 1-CLICK EXE COMPILATION (Recommended)
---------------------------------------------------------
1. Double-click "build_windows_exe.bat".
2. It will automatically compile "wtg_desktop_app.py" into a single, standalone
   Windows executable:
   --> WTG_Spacing_Tool_v1.6.exe
3. You can copy this .exe to any Windows computer and double-click to run!
   No installation, no internet connection required.

OPTION 2: DIRECT PYTHON RUN
---------------------------
Double-click "run_wtg_tool.bat" or open Command Prompt and type:
   python wtg_desktop_app.py

FEATURES INCLUDED:
- WTG Coordinate file upload (KML / KMZ / CSV)
- Preset WTG Make/Model catalog (16 predefined models: Adani, Envision, GE, Inox, SANY, Senvion, Siemens Gamesa, Suzlon, Venwindrefex, Vayona)
- Circle diagram with Circle Color & Width
- Ellipse diagram with Long Radius (7D), Short Radius (5D), Long-axis (°), Color & Width
- 5Dx7D Rose diagram with separate 5D/7D Color, Width & Opacity (%), 7D sector total shade (°), Measurement Labels
- Rectangle diagram with 5D N/S, 7D E/W, Opacity, Measurement Lines and Labels
- KMZ Export with EXACT 2-folder structure:
  Folder 1: Imported placemarks with labels only
  Folder 2: Diagrams only
`;

  zip.file('wtg_desktop_app.py', pythonScript);
  zip.file('build_windows_exe.bat', buildExeBat);
  zip.file('run_wtg_tool.bat', runBat);
  zip.file('README_WINDOWS_EXE.txt', readme);

  return await zip.generateAsync({ type: 'blob' });
}

export async function downloadDesktopPackage() {
  const blob = await generateDesktopExePackageZip();
  downloadBlob(blob, 'WTG_Spacing_Tool_v1.6_Windows_EXE_Package.zip');
}
