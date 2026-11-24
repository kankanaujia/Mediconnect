import type { Medicine } from "@/lib/prescriptions";

// Minimal one-page PDF (Helvetica, no external libraries), same approach as receiptPdf.ts.

function escape(value: string) {
  // PDF base fonts are Latin-1; replace characters they cannot show.
  return value
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrap(line: string, width = 88) {
  const words = line.split(/\s+/);
  const out: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > width) {
      if (current) out.push(current);
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) out.push(current);
  return out.length ? out : [""];
}

export function generatePrescriptionPdf(input: {
  patientName: string;
  doctorName: string;
  specialization: string;
  hospitalName: string;
  appointmentDate: string;
  diagnosis: string | null;
  medicines: Medicine[];
  advice: string | null;
  followUpDate: string | null;
  issuedOn: string;
}) {
  const lines: { text: string; size: number }[] = [
    { text: "MediConnect Prescription", size: 18 },
    { text: "", size: 8 },
    { text: `Doctor: ${input.doctorName} (${input.specialization})`, size: 11 },
    { text: `Hospital: ${input.hospitalName}`, size: 11 },
    { text: `Patient: ${input.patientName}`, size: 11 },
    { text: `Visit date: ${input.appointmentDate}    Issued: ${input.issuedOn}`, size: 11 },
    { text: "", size: 8 },
  ];

  if (input.diagnosis) {
    lines.push({ text: "Diagnosis", size: 13 });
    for (const l of wrap(input.diagnosis)) lines.push({ text: l, size: 11 });
    lines.push({ text: "", size: 8 });
  }

  if (input.medicines.length) {
    lines.push({ text: "Medicines", size: 13 });
    input.medicines.forEach((m, i) => {
      const parts = [m.dosage, m.frequency, m.days ? `${m.days} days` : ""].filter(Boolean).join(", ");
      lines.push({ text: `${i + 1}. ${m.name}${parts ? ` - ${parts}` : ""}`, size: 11 });
      if (m.notes) for (const l of wrap(`   ${m.notes}`)) lines.push({ text: l, size: 10 });
    });
    lines.push({ text: "", size: 8 });
  }

  if (input.advice) {
    lines.push({ text: "Advice", size: 13 });
    for (const l of wrap(input.advice)) lines.push({ text: l, size: 11 });
    lines.push({ text: "", size: 8 });
  }

  if (input.followUpDate) {
    lines.push({ text: `Follow-up: ${input.followUpDate}`, size: 12 });
  }

  let y = 790;
  const stream = lines
    .map((line) => {
      y -= line.size + 8;
      return `BT /F1 ${line.size} Tf 50 ${y} Td (${escape(line.text)}) Tj ET`;
    })
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf-8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf, "utf-8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf-8");
}
