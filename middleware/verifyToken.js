const jwt = require('jsonwebtoken');

// Middleware function to verify token
function verifyToken(req, res, next) {
  // Get the token from request headers
  const token = req.headers.authorization;
  // Check if token is present
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  // Verify the token
  jwt.verify(token, 'your_secret_key', (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Failed to authenticate token' });
    }
    req.user=decoded
    // If token is verified, attach the decoded payload to the request object
    next();
  });
}

module.exports = verifyToken;

