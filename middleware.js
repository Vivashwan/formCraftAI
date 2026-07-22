import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// NOTE: /api/status must stay PUBLIC. PhonePe hits it as a cross-site POST,
// so the browser withholds Clerk's SameSite=Lax session cookie and
// auth().protect() would reject the callback as an unknown user.
const isProtectedRoute = createRouteMatcher(["/dashboard"]);


export default clerkMiddleware((auth, req) => {
  // Redirect signed-out visitors to the sign-in page instead of rewriting to a
  // dead-end 404 (which is what bare auth().protect() does for a missing session).
  if (isProtectedRoute(req) && !auth().userId) {
    return auth().redirectToSignIn({ returnBackUrl: req.url });
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
