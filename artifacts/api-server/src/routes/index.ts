import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sponsorRouter from "./sponsor";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sponsorRouter);

export default router;
