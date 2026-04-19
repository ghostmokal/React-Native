import { Router, type IRouter } from "express";
import healthRouter from "./health";
import uploadRouter from "./upload";
import uploadFileRouter from "./upload-file";

const router: IRouter = Router();

router.use(healthRouter);
router.use(uploadRouter);
router.use(uploadFileRouter);

export default router;
