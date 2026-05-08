/**
 * Room Scan Controller
 * Handles photo upload and room dimension analysis
 */

import { type Request, type Response, type NextFunction } from 'express';

import { PhotoRoomScannerService } from '../../services/ai/photo-room-scanner.service';
import { RoomScanService } from '../../services/room-scan.service';
import logger from '../../utils/logger';

class RoomScanController {
  /**
   * POST /room-scan/analyze
   * Analyze room photos to extract dimensions (legacy endpoint)
   */
  async analyzeRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'NO_PHOTOS', message: 'Au moins une photo est requise.' },
        });
        return;
      }

      if (files.length > 3) {
        res.status(400).json({
          success: false,
          error: { code: 'TOO_MANY_PHOTOS', message: 'Maximum 3 photos autorisees.' },
        });
        return;
      }

      // Optional context from body
      const context = req.body?.context ? JSON.parse(req.body.context) : undefined;

      const roomScanService = new RoomScanService();
      const result = await roomScanService.analyzeRoomFromPhotos(files, context);

      logger.info('[RoomScan] Room analysis completed', {
        userId: req.user?.userId,
        photoCount: files.length,
        confidence: result.confidence,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('[RoomScan] Analysis failed', { error });
      next(error);
    }
  }

  /**
   * POST /room-scan/photo-scan
   * F3: Photo Room Scanner — structured AI analysis of 1-3 photos
   * Returns walls, openings, technical points, obstacles, and floor plan data
   */
  async photoScan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
        });
        return;
      }

      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'NO_PHOTOS', message: 'Au moins une photo est requise.' },
        });
        return;
      }

      if (files.length > 3) {
        res.status(400).json({
          success: false,
          error: { code: 'TOO_MANY_PHOTOS', message: 'Maximum 3 photos autorisees.' },
        });
        return;
      }

      // Validate each file size (max 10MB)
      const maxFileSize = 10 * 1024 * 1024;
      for (const file of files) {
        if (file.size > maxFileSize) {
          res.status(413).json({
            success: false,
            error: { code: 'FILE_TOO_LARGE', message: 'Chaque photo doit faire moins de 10 Mo.' },
          });
          return;
        }
      }

      const photoBuffers = files.map((f) => f.buffer);
      const mediaTypes = files.map(
        (f) => f.mimetype as 'image/jpeg' | 'image/png' | 'image/webp',
      );

      const scanner = new PhotoRoomScannerService();
      const scanResult = await scanner.analyzeRoom(photoBuffers, userId, mediaTypes);
      const floorPlan = await scanner.generateFloorPlan(scanResult);

      logger.info('[RoomScan] Photo scan completed', {
        userId,
        photoCount: files.length,
        confidence: scanResult.dimensions.confidence,
        wallCount: scanResult.walls.length,
      });

      res.status(200).json({
        success: true,
        data: {
          scan: scanResult,
          floorPlan,
        },
      });
    } catch (error) {
      logger.error('[RoomScan] Photo scan failed', { error });
      next(error);
    }
  }
}

export const roomScanController = new RoomScanController();
