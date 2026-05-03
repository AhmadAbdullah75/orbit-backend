import express from "express";
import { getColumns, addColumn, reorderColumn, deleteColumn } from "../controllers/columnController.js";
import { protect } from "../middlewares/protect.js";

const boardRouter = express.Router({ mergeParams: true });
const columnRouter = express.Router();

boardRouter.use(protect);
columnRouter.use(protect);

boardRouter.get("/", getColumns);
boardRouter.post("/", addColumn);
columnRouter.patch("/:id/reorder", reorderColumn);
columnRouter.delete("/:id", deleteColumn);

export { boardRouter, columnRouter };
