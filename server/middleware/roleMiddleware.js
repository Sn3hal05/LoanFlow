const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    // Admin has access to all roles
    if (req.user.role === 'admin' || roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      message: `Access denied. Role '${req.user.role}' is not authorized to access this resource. Required: [${roles.join(', ')}]`,
    });
  };
};

module.exports = { authorizeRoles };
