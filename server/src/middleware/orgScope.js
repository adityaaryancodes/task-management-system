export function validateOrgScope(req, res, next) {
  const orgIdHeader = req.headers['x-org-id'];
  if (!orgIdHeader) {
    return res.status(400).json({ message: 'x-org-id header is required' });
  }
  if (!req.user || req.user.org_id !== orgIdHeader) {
    return res.status(403).json({ message: 'Invalid organization scope' });
  }
  req.orgId = orgIdHeader;
  return next();
}
