type ReceiptInput = {
  receiptId: string;
  patientName: string;
  doctorName: string;
  hospitalName: string;
  appointmentDate: string;
  appointmentTime: string;
  amount: number;
  currency: string;
  paymentId?: string;
  bookingType: string;
};

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function generateReceiptPdf(input: ReceiptInput) {
  const amountText = `${input.currency} ${(input.amount / 100).toFixed(2)}`;
  const lines = [
    "MediConnect Appointment Receipt",
    `Receipt: ${input.receiptId}`,
    `Patient: ${input.patientName}`,
    `Doctor: ${input.doctorName}`,
    `Hospital: ${input.hospitalName}`,
    `Booking Type: ${input.bookingType}`,
    `Appointment: ${input.appointmentDate} ${input.appointmentTime}`,
    `Amount Paid: ${amountText}`,
    `Payment ID: ${input.paymentId ?? "Pending"}`,
  ];

  const stream = lines
    .map(
      (line, index) =>
        `BT /F1 12 Tf 50 ${780 - index * 24} Td (${escapePdfText(line)}) Tj ET`
    )
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
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
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf-8");
}
