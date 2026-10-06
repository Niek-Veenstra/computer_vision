import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  const authenticate = jest.fn();
  const authService = { authenticate } as unknown as AuthService;
  const controller = new AuthController(authService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('authenticates with the submitted credentials', async () => {
    const credentials = {
      email: 'user@example.com',
      password: 'secret-password',
    };
    authenticate.mockResolvedValue({ token: 'signed-token' });

    await expect(controller.authenticate(credentials)).resolves.toEqual({
      token: 'signed-token',
    });
    expect(authenticate).toHaveBeenCalledWith(
      credentials.email,
      credentials.password,
    );
  });
});
