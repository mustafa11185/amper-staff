import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export { getServerSession, authOptions };

export async function requireCollector() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "collector") {
    throw new Error("Unauthorized");
  }
  return session.user as any;
}

export async function requireOperator() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "operator") {
    throw new Error("Unauthorized");
  }
  return session.user as any;
}

export async function requireOperatorOrDual() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) throw new Error("Unauthorized");
  if (user.role === "operator") return user;
  if (user.role === "collector" && user.isDualRole) return user;
  throw new Error("Unauthorized");
}

export async function requireStaff() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user as any;
}
