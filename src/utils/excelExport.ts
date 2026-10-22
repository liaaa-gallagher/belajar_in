import * as XLSX from 'xlsx';
import { Submission } from '../types';

export function exportSubmissionsToExcel(
  submissions: Submission[],
  assignmentTitle: string,
  className: string
) {
  if (!submissions || submissions.length === 0) {
    alert('Tidak ada data yang dipilih untuk di-ekspor ke Excel.');
    return;
  }

  const rows = submissions.map((sub, index) => {
    // Format cheat incidents summary
    const cheatSummary =
      sub.cheatingCount > 0
        ? sub.cheatingIncidents && sub.cheatingIncidents.length > 0
          ? sub.cheatingIncidents
              .map(
                (c, i) =>
                  `[#${i + 1} Soal No.${c.questionNumber}: ${c.durationSeconds} detik]`
              )
              .join('; ')
          : `${sub.cheatingCount}x perpindahan tab`
        : '0 (Tertib)';

    return {
      'No': index + 1,
      'Nama Siswa': sub.studentName,
      'No. Absen': sub.studentAbsen || '-',
      'Kelas': sub.studentClass,
      'Judul Tugas': sub.assignmentTitle,
      'Tipe Materi':
        sub.assignmentType === 'lkpd'
          ? 'LKPD'
          : sub.assignmentType === 'bank_soal'
          ? 'Bank Soal'
          : 'Evaluasi UH',
      'Nilai Akhir': sub.totalScore !== undefined ? sub.totalScore : 'Belum Dinilai',
      'Nilai Maksimal': sub.maxScore,
      'Status Koreksi': sub.status === 'reviewed' ? 'Sudah Diperiksa & Feedback' : 'Menunggu Koreksi',
      'Jumlah Kecurangan': sub.cheatingCount,
      'Rincian Pelanggaran Kecurangan': cheatSummary,
      'Waktu Pengumpulan': new Date(sub.submittedAt).toLocaleString('id-ID'),
      'Feedback Guru': sub.overallFeedback || '-',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 25 }, // Nama
    { wch: 10 }, // Absen
    { wch: 12 }, // Kelas
    { wch: 30 }, // Judul
    { wch: 14 }, // Tipe
    { wch: 12 }, // Nilai
    { wch: 14 }, // Nilai Max
    { wch: 24 }, // Status
    { wch: 18 }, // Jml Kecurangan
    { wch: 45 }, // Rincian Kecurangan
    { wch: 22 }, // Waktu
    { wch: 40 }, // Feedback
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Nilai');

  const filename = `Rekap_Nilai_${className.replace(/\s+/g, '_')}_${assignmentTitle.replace(/\s+/g, '_').slice(0, 20)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
