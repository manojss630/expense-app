import { Router, Request, Response } from 'express';
import { reportFilterSchema, pdfReportRequestSchema } from '@expense-app/shared';
import { validateQuery, validateBody } from '../middlewares/validate';
import { authMiddleware } from '../middlewares/auth';
import { DataService } from '../services/data.service';
import { PdfService } from '../services/pdf.service';

const router = Router();

// GET /api/reports/summary?from=&to=&memberId=
router.get('/summary', authMiddleware, validateQuery(reportFilterSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { from, to, memberId } = req.query as any;

    const summary = await DataService.getSummary(userId, { from, to, memberId });

    res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to generate summary' });
  }
});

// POST /api/reports/pdf
router.post('/pdf', authMiddleware, validateBody(pdfReportRequestSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { from, to, memberId, title } = req.body;

    const summary = await DataService.getSummary(userId, { from, to, memberId });
    const { expenses } = await DataService.getExpenses(userId, { from, to, memberId, limit: 1000 });

    const { reportId, filename, buffer } = await PdfService.generateExpenseReport(summary, expenses, {
      title,
      preparedFor: summary.memberName,
      generatedBy: req.user!.full_name,
    });

    res.json({
      success: true,
      data: {
        reportId,
        filename,
        size: buffer.length,
        downloadUrl: `/api/reports/pdf/${reportId}`,
      },
      message: 'PDF report generated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to generate PDF report' });
  }
});

// GET /api/reports/pdf/:reportId
router.get('/pdf/:reportId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    const report = PdfService.getCachedReport(reportId);

    if (!report) {
      res.status(404).json({ success: false, error: 'Report not found or expired' });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${report.filename}"`);
    res.setHeader('Content-Length', report.buffer.length);
    res.send(report.buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to stream PDF' });
  }
});

export default router;
