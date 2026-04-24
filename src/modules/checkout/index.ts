import { Router } from "express";
import { startCheckoutHandler } from "./checkout.controller.js";

const checkoutRouter = Router();

checkoutRouter.post("/start", startCheckoutHandler);

export { checkoutRouter };
