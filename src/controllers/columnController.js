import catchAsync from '../utils/catchAsync.js';
import Column from '../models/Column.js';
import Board from '../models/Board.js';
import AppError from '../utils/AppError.js';

export const getColumns = catchAsync(async (req, res, next) => {
  const { boardId } = req.params;
  const columns = await Column.find({ board: boardId }).sort({ order: 1 });
  res.status(200).json({ status: "success", data: { columns } });
});

export const addColumn = catchAsync(async (req, res, next) => {
  const { name, color } = req.body;
  const { boardId } = req.params;

  const board = await Board.findById(boardId);
  if (!board) return next(new AppError('Board not found', 404));

  const existingColumn = await Column.findOne({
    board: boardId,
    name: {
      $regex: new RegExp(
        `^${name.trim().replace(
          /[.*+?^${}()|[\]\\]/g, '\\$&'
        )}$`,
        'i'
      )
    }
  })

  if (existingColumn) {
    return next(new AppError(
      `A column named "${name.trim()}" ` +
      `already exists in this board.`,
      400
    ))
  }

  const lastColumn = await Column.findOne({ board: boardId })
    .sort({ order: -1 });
  const nextOrder = lastColumn ? lastColumn.order + 1 : 0;

  const column = await Column.create({
    name,
    color: color || '#e2e8f0',
    board: boardId,
    order: nextOrder,
    isDefault: false,
  });

  res.status(201).json({ status: 'success', data: { column } });
});

export const reorderColumn = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { order } = req.body;

  const column = await Column.findById(id);
  if (!column) return next(new AppError('Column not found', 404));

  const boardId = column.board;

  // Shift other columns to make room
  await Column.updateMany(
    { board: boardId, order: { $gte: order }, _id: { $ne: id } },
    { $inc: { order: 1 } }
  );

  column.order = order;
  await column.save();

  const columns = await Column.find({ board: boardId }).sort({ order: 1 });

  res.status(200).json({ status: 'success', data: { columns } });
});

export const deleteColumn = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const column = await Column.findById(id);
  if (!column) return next(new AppError('Column not found', 404));

  if (column.isDefault) {
    return next(new AppError('Cannot delete a default column', 400));
  }

  await Column.findByIdAndDelete(id);

  res.status(200).json({ status: 'success', message: 'Column deleted successfully.' });
});