import { jsPDF } from 'jspdf';
import { AssignmentItem, Submission } from '../types';

export async function exportStudentSubmissionPdf(
  assignment: AssignmentItem,
  submission: Submission
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  function checkPageBreak(neededSpace: number) {
    if (y + neededSpace > pageHeight - 15) {
      doc.addPage();
      y = 18;
    }
  }

  // Header Belajarin
  doc.setFillColor(99, 102, 241); // indigo-500
  doc.rect(margin, y, contentWidth, 12, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BELAJARIN - LEMBAR HASIL & KOREKSI TUGAS', margin + 4, y + 8);

  y += 18;

  // Metadata Box
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Nama Siswa    : ${submission.studentName}`, margin + 5, y + 7);
  doc.text(`Kelas / Absen : ${submission.studentClass} / No. ${submission.studentAbsen || '-'}`, margin + 5, y + 14);
  doc.text(`Materi / Bab  : ${submission.chapter}`, margin + 5, y + 21);
  doc.text(`Judul Tugas   : ${submission.assignmentTitle}`, margin + 5, y + 28);
  doc.text(
    `Waktu Kumpul  : ${new Date(submission.submittedAt).toLocaleString('id-ID')}`,
    margin + 5,
    y + 35
  );

  // Score & Cheating Badge on Right
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(pageWidth - margin - 50, y + 4, 45, 30, 2, 2, 'FD');

  doc.setTextColor(79, 70, 229);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('NILAI AKHIR', pageWidth - margin - 45, y + 11);

  doc.setFontSize(18);
  doc.text(`${submission.totalScore ?? '-'} / ${submission.maxScore}`, pageWidth - margin - 45, y + 20);

  doc.setFontSize(8);
  doc.setTextColor(submission.cheatingCount > 0 ? 220 : 16, submission.cheatingCount > 0 ? 38 : 149, submission.cheatingCount > 0 ? 38 : 193);
  doc.text(
    submission.cheatingCount > 0 ? `Kecurangan: ${submission.cheatingCount}x` : 'Kecurangan: 0x (Tertib)',
    pageWidth - margin - 45,
    y + 28
  );

  y += 44;

  // Cheating Incidents Detail if any
  if (submission.cheatingIncidents && submission.cheatingIncidents.length > 0) {
    checkPageBreak(25);
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(margin, y, contentWidth, 18 + submission.cheatingIncidents.length * 6, 2, 2, 'FD');

    doc.setTextColor(185, 28, 28);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('⚠️ Catatan Pendeteksi Kecurangan (Pindah Jendela/Tab saat Pengerjaan):', margin + 4, y + 6);

    let incidentY = y + 12;
    submission.cheatingIncidents.forEach((inc, idx) => {
      doc.setFont('helvetica', 'normal');
      doc.text(
        `• Pelanggaran #${idx + 1}: Terdeteksi pada Soal No. ${inc.questionNumber} selama ${inc.durationSeconds} detik (${new Date(inc.timestamp).toLocaleTimeString('id-ID')})`,
        margin + 6,
        incidentY
      );
      incidentY += 6;
    });

    y += 24 + submission.cheatingIncidents.length * 6;
  }

  // Overall Feedback from Teacher
  if (submission.overallFeedback) {
    checkPageBreak(24);
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(153, 246, 228);
    const feedbackLines = doc.splitTextToSize(`Umpan Balik Guru: ${submission.overallFeedback}`, contentWidth - 8);
    const boxHeight = 10 + feedbackLines.length * 5;

    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');
    doc.setTextColor(15, 118, 110);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(feedbackLines, margin + 4, y + 6);

    y += boxHeight + 6;
  }

  // Section title: Rincian Soal & Jawaban
  checkPageBreak(15);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Rincian Soal, Jawaban Siswa, & Pembahasan', margin, y);
  y += 7;

  // Questions
  for (const q of assignment.questions) {
    const studentAns = submission.answers.find(
      (a) => a.questionId === q.id || a.questionNumber === q.number
    );
    const qFeedback = submission.perQuestionFeedback?.find(
      (f) => f.questionNumber === q.number
    );

    checkPageBreak(35);

    // Question header bar
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);

    const typeBadge = q.type === 'pilihan_ganda' ? '[Pilihan Ganda]' : '[Esai]';
    const scoreText = qFeedback
      ? `Skor: ${qFeedback.scoreAwarded} / ${q.points} poin`
      : `Bobot: ${q.points} poin`;

    doc.text(`Soal No. ${q.number} ${typeBadge}`, margin + 3, y + 5.5);
    doc.text(scoreText, pageWidth - margin - 35, y + 5.5);
    y += 11;

    // Question Text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const qLines = doc.splitTextToSize(q.question, contentWidth - 4);
    checkPageBreak(qLines.length * 5);
    doc.text(qLines, margin + 2, y);
    y += qLines.length * 5 + 3;

    // Student Answer
    checkPageBreak(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Jawaban Anda:', margin + 2, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    if (q.type === 'pilihan_ganda') {
      const selectedOpt = q.options?.find((o) => o.id === studentAns?.selectedOptionId);
      const ansText = selectedOpt
        ? `${selectedOpt.text}`
        : studentAns?.selectedOptionId
        ? `Pilihan: ${studentAns.selectedOptionId}`
        : '(Tidak dijawab)';
      doc.text(ansText, margin + 6, y);
      y += 6;
    } else {
      const essayLines = doc.splitTextToSize(studentAns?.essayText || '(Tidak mengisi teks esai)', contentWidth - 10);
      checkPageBreak(essayLines.length * 5);
      doc.text(essayLines, margin + 6, y);
      y += essayLines.length * 5 + 3;
    }

    // Photo uploaded by student for this question
    if (studentAns?.uploadedPhotoUrl && studentAns.uploadedPhotoUrl.startsWith('data:image')) {
      try {
        checkPageBreak(50);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(99, 102, 241);
        doc.text('📷 Lampiran Foto Jawaban Siswa:', margin + 2, y);
        y += 4;

        // Render photo in PDF
        const imgWidth = 70;
        const imgHeight = 45;
        doc.addImage(studentAns.uploadedPhotoUrl, 'JPEG', margin + 6, y, imgWidth, imgHeight);
        y += imgHeight + 5;
      } catch (err) {
        console.error('Error adding photo to pdf:', err);
      }
    }

    // Teacher feedback per question if available
    if (qFeedback && qFeedback.feedbackText) {
      checkPageBreak(15);
      doc.setFillColor(254, 252, 232); // amber-50
      doc.setDrawColor(254, 240, 138); // amber-200
      const fbLines = doc.splitTextToSize(`Catatan Guru: ${qFeedback.feedbackText}`, contentWidth - 12);
      const h = 8 + fbLines.length * 4.5;
      doc.roundedRect(margin + 4, y, contentWidth - 8, h, 1, 1, 'FD');
      doc.setTextColor(146, 64, 14); // amber-800
      doc.setFont('helvetica', 'italic');
      doc.text(fbLines, margin + 7, y + 5);
      y += h + 5;
    }

    y += 4;
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Dicetak dari Platform Belajarin • Halaman ${i} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  const safeFilename = `Belajarin_${submission.studentName.replace(/\s+/g, '_')}_${assignment.title.replace(/\s+/g, '_').slice(0, 20)}.pdf`;
  doc.save(safeFilename);
}
