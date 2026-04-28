import { Router } from "express";
import { 
  createCheckoutSessionHandler, 
  getCheckoutStatusHandler, 
  verifyPaymentHandler 
} from "./checkout.controller.js";

const checkoutRouter = Router();

checkoutRouter.post("/sessions", createCheckoutSessionHandler);
checkoutRouter.get("/sessions/:checkoutId", getCheckoutStatusHandler);
checkoutRouter.post("/sessions/:checkoutId/verify-payment", verifyPaymentHandler);

export { checkoutRouter };
