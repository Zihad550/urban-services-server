import catchAsync from "../utils/catchAsync";
import admin from "firebase-admin";

const auth = () => {
  return catchAsync(async (req, res, next) => {
    if (req.headers?.authorization?.startsWith("Bearer ")) {
      const idToken = req.headers.authorization.split(" ")[1];
      const decodedUser = await admin.auth().verifyIdToken(idToken);
      if (!decodedUser?.email) throw new Error("User not found!");
      req.user = {
        email: decodedUser.email,
      };
    }
    next();
  });
};

export default auth;
