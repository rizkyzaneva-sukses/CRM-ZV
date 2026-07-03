const request = require('supertest');
const { app } = require('../index');
const { pool } = require('../utils/db');

// Mock the database pool to avoid needing a real connection during testing
jest.mock('../utils/db', () => ({
  query: jest.fn()
}));

describe('Auth Endpoints', () => {
  it('should return 401 for /api/auth/me if no token is provided', async () => {
    // No mock needed for this case since middleware catches it before DB
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error');
  });

  it('should login and return token with valid credentials', async () => {
    // Mock the bcrypt compare and DB query
    const bcrypt = require('bcrypt');
    jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
    
    // Mock user found in DB
    const { query } = require('../utils/db');
    query.mockResolvedValueOnce({
      rows: [{
        id: '123-uuid',
        email: 'admin@zaneva.com',
        full_name: 'Admin',
        role: 'admin',
        custom_role: 'ADMIN',
        password_hash: 'hashed_password'
      }]
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@zaneva.com',
        password: 'admin123'
      });
      
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toEqual('admin@zaneva.com');
  });
});
