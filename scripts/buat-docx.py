# -*- coding: utf-8 -*-
"""
Script: buat-docx.py
Fungsi: Mengonversi PANDUAN.md menjadi dokumentasi Word (.docx)
        dengan format yang rapi dan mudah dibaca.
"""
import re
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = Document()

# Atur style default dokumen
style = doc.styles["Normal"]
style.font.name = "Calibri"
style.font.size = Pt(11)

# Baca file markdown
with open("PANDUAN.md", encoding="utf-8") as f:
    lines = f.read().split("\n")

def add_code_block(doc, code_lines):
    """Menambahkan blok kode dengan gaya monospace dan background abu-abu."""
    for line in code_lines:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(line)
        run.font.name = "Consolas"
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(0xC7, 0x25, 0x4E)

i = 0
while i < len(lines):
    line = lines[i]

    # Blok kode (diawali ```)
    if line.strip().startswith("```"):
        lang = line.strip()[3:]
        i += 1
        code_lines = []
        while i < len(lines) and not lines[i].strip().startswith("```"):
            code_lines.append(lines[i])
            i += 1
        add_code_block(doc, code_lines)
        i += 1  # lewati penutup ```
        continue

    # Judul level 1 (#)
    if line.startswith("# "):
        p = doc.add_heading(line[2:].strip(), level=1)
        i += 1
        continue

    # Judul level 2 (##)
    if line.startswith("## "):
        doc.add_heading(line[3:].strip(), level=2)
        i += 1
        continue

    # Judul level 3 (###)
    if line.startswith("### "):
        doc.add_heading(line[4:].strip(), level=3)
        i += 1
        continue

    # Garis pemisah (---)
    if line.strip() == "---":
        p = doc.add_paragraph()
        p.add_run("_" * 60).font.color.rgb = RGBColor(0xBB, 0xBB, 0xBB)
        i += 1
        continue

    # Baris kosong
    if line.strip() == "":
        i += 1
        continue

    # Tabel markdown (diawali |)
    if line.strip().startswith("|"):
        # Kumpulkan semua baris tabel
        table_lines = []
        while i < len(lines) and lines[i].strip().startswith("|"):
            table_lines.append(lines[i].strip())
            i += 1

        # Parse baris tabel
        rows = []
        for tl in table_lines:
            cells = [c.strip() for c in tl.strip("|").split("|")]
            # Lewati baris pemisah seperti |---|---|
            if all(re.fullmatch(r":?-+:?", c) for c in cells):
                continue
            rows.append(cells)

        if rows:
            ncols = max(len(r) for r in rows)
            table = doc.add_table(rows=0, cols=ncols)
            table.style = "Light Grid Accent 1"
            for r in rows:
                row_cells = table.add_row().cells
                for c_idx, cell_text in enumerate(r):
                    if c_idx < ncols:
                        # Bersihkan penanda bold **teks**
                        cell_text = re.sub(r"\*\*(.+?)\*\*", r"\1", cell_text)
                        row_cells[c_idx].text = cell_text
        continue

    # Paragraf biasa (bisa mengandung **bold** dan `code`)
    p = doc.add_paragraph()
    # Proses inline: **bold**, `code`
    pos = 0
    pattern = re.compile(r"(\*\*.+?\*\*|`[^`]+`)")
    for m in pattern.finditer(line):
        if m.start() > pos:
            p.add_run(line[pos:m.start()])
        token = m.group(0)
        if token.startswith("**") and token.endswith("**"):
            run = p.add_run(token[2:-2])
            run.bold = True
        else:
            run = p.add_run(token[1:-1])
            run.font.name = "Consolas"
            run.font.size = Pt(9)
            run.font.color.rgb = RGBColor(0xC7, 0x25, 0x4E)
        pos = m.end()
    if pos < len(line):
        p.add_run(line[pos:])
    i += 1

# Simpan file Word
doc.save("DOKUMENTASI-MyNotes.docx")
print("Berhasil membuat DOKUMENTASI-MyNotes.docx")
