import { Router } from "express";
import { createCheckoutSessionHandler, getCheckoutStatusHandler } from "./checkout.controller.js";

const checkoutRouter = Router();

checkoutRouter.post("/sessions", createCheckoutSessionHandler);
checkoutRouter.get("/sessions/:checkoutId", getCheckoutStatusHandler);

export { checkoutRouter };
