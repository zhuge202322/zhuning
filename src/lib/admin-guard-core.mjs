export function isSuperAdminSession(session, admin) {
  return Boolean(
    session &&
      admin &&
      session.role !== "customer" &&
      Number.isInteger(session.id) &&
      session.id > 0 &&
      session.id === admin.id &&
      session.username === admin.username &&
      session.sessionVersion === admin.sessionVersion,
  );
}

export function assertSingleSuperAdmin(admins) {
  if (admins.length > 1) {
    throw new Error("Exactly one Super Admin is required");
  }
}
