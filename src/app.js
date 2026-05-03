dotenv.config(); 

import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './config/swagger.js'
import errorHandler from './middlewares/errorHandler.js';
import AppError from './utils/AppError.js';
import { protect } from './middlewares/protect.js';
import passport from './config/passport.js';
import authRoutes from './routes/authRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import { boardRouter, columnRouter } from './routes/columnRoutes.js';
import { columnTaskRouter, taskRouter } from './routes/taskRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import * as activityController from './controllers/activityController.js';

const app = express();

// Auth rate limiter — 20 requests per 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    status: 'error',
    message:
      'Too many requests from this IP, '
      + 'please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// General API limiter — 200 requests per min
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: {
    status: 'error',
    message: 'Rate limit exceeded.',
  },
})

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(cookieParser());

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger Docs
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Orbit API Docs',
    customCss: `
      .swagger-ui .topbar { display: none }
    `,
  })
)

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Orbit API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
  })
})

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', apiLimiter);
app.use('/api/organizations', organizationRoutes);
app.use('/api/organizations/:orgId/projects', projectRoutes);
app.use('/api/boards/:boardId/columns', boardRouter);
app.use('/api/columns', columnRouter);
app.use('/api/boards/:boardId/columns/:columnId/tasks', columnTaskRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.get('/api/projects/:id/activity', protect, activityController.getProjectActivity);

app.all('/{0,}', (req, res, next) => {
  next(new AppError('Cannot find ' + req.originalUrl + ' on this server!', 404));
});

app.use(errorHandler);

export default app;
