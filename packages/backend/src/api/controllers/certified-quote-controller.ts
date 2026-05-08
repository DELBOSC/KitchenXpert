/**
 * Certified Quote Controller
 *
 * Handles HTTP requests for the certified quote (devis) feature.
 * All routes require authentication; ownership is verified in the service layer.
 */

import { type Request, type Response } from 'express';

import { getCertifiedQuoteService } from '../../services/quote/certified-quote.service';
import logger from '../../utils/logger';
import { asyncHandler } from '../middleware/error-middleware';

const quoteService = getCertifiedQuoteService();

export class CertifiedQuoteController {
  /**
   * POST /certified-quotes
   * Create a new certified quote
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const quote = await quoteService.create(userId, req.body);

    res.status(201).json({
      success: true,
      data: quote,
      message: 'Certified quote created successfully',
    });
  });

  /**
   * GET /certified-quotes
   * List all quotes for the current user
   */
  list = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const quotes = await quoteService.list(userId);

    res.status(200).json({
      success: true,
      data: quotes,
    });
  });

  /**
   * GET /certified-quotes/next-number
   * Get the next available quote number
   */
  getNextNumber = asyncHandler(async (_req: Request, res: Response) => {
    const nextNumber = await quoteService.getNextNumber();

    res.status(200).json({
      success: true,
      data: { quoteNumber: nextNumber },
    });
  });

  /**
   * GET /certified-quotes/:id
   * Get a single quote by ID
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    try {
      const quote = await quoteService.getById(req.params.id as string, userId);
      res.status(200).json({ success: true, data: quote });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Quote not found') {
        res.status(404).json({ success: false, error: message });
      } else if (message === 'Access denied') {
        res.status(403).json({ success: false, error: message });
      } else {
        throw error;
      }
    }
  });

  /**
   * POST /certified-quotes/:id/sign
   * Sign a quote with eIDAS-compatible signature
   */
  sign = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    try {
      const quote = await quoteService.sign(req.params.id as string, userId);
      res.status(200).json({
        success: true,
        data: quote,
        message: 'Quote signed successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Quote not found') {
        res.status(404).json({ success: false, error: message });
      } else if (message === 'Access denied') {
        res.status(403).json({ success: false, error: message });
      } else if (message.includes('already signed') || message.includes('Cannot sign')) {
        res.status(400).json({ success: false, error: message });
      } else {
        throw error;
      }
    }
  });

  /**
   * POST /certified-quotes/:id/send
   * Send a quote by email
   */
  send = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }

    try {
      await quoteService.send(req.params.id as string, userId, email);
      res.status(200).json({
        success: true,
        message: 'Quote sent successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Quote not found') {
        res.status(404).json({ success: false, error: message });
      } else if (message === 'Access denied') {
        res.status(403).json({ success: false, error: message });
      } else {
        logger.error('Failed to send quote email', { error, quoteId: req.params.id });
        throw error;
      }
    }
  });

  /**
   * GET /certified-quotes/:id/pdf
   * Download the quote as PDF (HTML for now)
   */
  downloadPDF = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    try {
      const { html, quote } = await quoteService.generatePDF(
        req.params.id as string,
        userId
      );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="devis-${quote.quoteNumber}.html"`
      );
      res.send(html);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Quote not found') {
        res.status(404).json({ success: false, error: message });
      } else if (message === 'Access denied') {
        res.status(403).json({ success: false, error: message });
      } else {
        throw error;
      }
    }
  });
}

export const certifiedQuoteController = new CertifiedQuoteController();
export default certifiedQuoteController;
