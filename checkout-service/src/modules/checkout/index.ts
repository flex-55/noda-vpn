import { Router } from "express";
import { createCheckoutSessionHandler } from "./checkout.controller.js";

const checkoutRouter = Router();

checkoutRouter.post("/sessions", createCheckoutSessionHandler);

export { checkoutRouter };
