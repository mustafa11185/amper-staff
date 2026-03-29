export function generateSubscriberCode(
  tenantSeq: number,
  branchSeq: number,
  subscriberSeq: number
): string {
  const t = tenantSeq.toString().padStart(2, "0");
  const b = branchSeq.toString().padStart(2, "0");
  const s = subscriberSeq.toString().padStart(4, "0");
  const digit1 = (tenantSeq + branchSeq) % 10;
  const digit2 = (branchSeq * subscriberSeq) % 10;
  const checksum = `${digit1}${digit2}`;
  return `${t}-${b}-${s}-${checksum}`;
}

export function verifySubscriberCode(code: string): boolean {
  const parts = code.split("-");
  if (parts.length !== 4) return false;
  const [t, b, s, check] = parts;
  const tenantSeq = parseInt(t);
  const branchSeq = parseInt(b);
  const subscriberSeq = parseInt(s);
  if (isNaN(tenantSeq) || isNaN(branchSeq) || isNaN(subscriberSeq)) return false;
  const digit1 = (tenantSeq + branchSeq) % 10;
  const digit2 = (branchSeq * subscriberSeq) % 10;
  return check === `${digit1}${digit2}`;
}

export function parseSubscriberCode(code: string): {
  tenantSeq: number;
  branchSeq: number;
  subscriberSeq: number;
  checksum: string;
} | null {
  const parts = code.split("-");
  if (parts.length !== 4) return null;
  return {
    tenantSeq: parseInt(parts[0]),
    branchSeq: parseInt(parts[1]),
    subscriberSeq: parseInt(parts[2]),
    checksum: parts[3],
  };
}
