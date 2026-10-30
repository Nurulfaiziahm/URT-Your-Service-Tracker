const topics = [
  { pattern: /\b(layar|lcd|oled|display|screen|touchscreen)\b/i, label: 'layar perangkat' },
  { pattern: /\b(keyboard|papan ketik|tombol)\b/i, label: 'keyboard atau tombol perangkat' },
  { pattern: /\b(baterai|battery)\b/i, label: 'baterai' },
  { pattern: /\b(charger|charging|pengisian|cas|port usb|usb port)\b/i, label: 'sistem pengisian daya' },
  { pattern: /\b(tegangan|voltage|power|suplai|daya|mati total)\b/i, label: 'suplai daya perangkat' },
  { pattern: /\b(korslet\w*|short|jalur|rangkaian)\b/i, label: 'rangkaian listrik perangkat' },
  { pattern: /\b(ic|chip|komponen|motherboard|mainboard|mosfet|kapasitor|resistor)\b/i, label: 'komponen elektronik' },
  { pattern: /\b(kipas|fan|pendingin|suhu|overheat\w*|panas)\b/i, label: 'sistem pendinginan' },
  { pattern: /\b(ssd|hdd|hard\s?disk|storage|penyimpanan)\b/i, label: 'penyimpanan perangkat' },
  { pattern: /\b(ram|memori|memory)\b/i, label: 'memori perangkat' },
  { pattern: /\b(software|aplikasi|sistem operasi|windows|boot\w*|firmware)\b/i, label: 'perangkat lunak' },
  { pattern: /\b(speaker|audio|suara|mikrofon|microphone)\b/i, label: 'sistem suara' },
  { pattern: /\b(wifi|wi-fi|jaringan|network|bluetooth)\b/i, label: 'koneksi perangkat' },
  { pattern: /\b(engsel|hinge|casing|bodi)\b/i, label: 'bagian fisik perangkat' },
];

function joinTopics(labels: string[]) {
  return labels.length < 2 ? labels[0] : `${labels.slice(0, -1).join(', ')} dan ${labels.at(-1)}`;
}

function describesFault(note: string) {
  // Treat negative symptoms as faults, but never turn "tidak rusak" or
  // "belum dipastikan" into a confirmed diagnosis.
  const normalized = note.replace(/\btidak\s+(?:bisa\s+)?(?:berfungsi|menyala|mengisi(?: daya)?|merespon|merespons|terdeteksi)\b/gi, 'bermasalah');
  if (/\b(tidak|bukan|tanpa|belum|normal|baik|bagus|aman|nihil|ok|lulus)\b/i.test(normalized)) return false;
  return /\b(rusak|bermasalah|pecah|retak|aus|bocor|korslet\w*|short|overheat\w*|macet|error|gagal|mati|lemah|drop|broken|faulty)\b/i.test(normalized);
}

export function diagnosisExplanation(staffFindings: string): string {
  if (!staffFindings.trim()) return '';
  const notes = staffFindings.split(/[\n.!?;]+/).filter((note) => note.trim());
  const reviewed = topics.filter((topic) => notes.some((note) => topic.pattern.test(note)));
  const faults = reviewed.filter((topic) => notes.some((note) => topic.pattern.test(note) && describesFault(note)));
  // Use only known, customer-facing phrases. Raw notes may contain passwords,
  // measurements or staff-only details and must not be copied to the customer.
  const findings = faults.length
    ? `Hasil pemeriksaan menunjukkan masalah pada ${joinTopics(faults.map((topic) => topic.label))}.`
    : reviewed.length
      ? `Pemeriksaan teknisi mencakup ${joinTopics(reviewed.map((topic) => topic.label))}.`
      : 'Hasil pemeriksaan awal perangkat Anda telah dicatat oleh teknisi.';
  return `${findings} Rekomendasi penanganan dan rincian biaya servis akan diajukan untuk persetujuan Anda sebelum perbaikan dimulai.`;
}

export function diagnosisItemDescription(staffFindings: string, type: 'labor' | 'part') {
  const matched = topics.filter((topic) => topic.pattern.test(staffFindings));
  const subject = matched.length ? joinTopics(matched.slice(0, 3).map((topic) => topic.label)) : 'perangkat';
  return type === 'part' ? `Suku cadang untuk ${subject}` : `Jasa pemeriksaan dan penanganan ${subject}`;
}
