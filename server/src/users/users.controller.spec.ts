import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  const findAllPublic = jest.fn();
  const usersService = { findAllPublic } as unknown as UsersService;
  const controller = new UsersController(usersService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the public users from the service', async () => {
    const users = [
      {
        id: '81b160a4-9768-482b-946b-f3e76588e49b',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        birthDate: '2000-01-01',
      },
    ];
    findAllPublic.mockResolvedValue(users);

    await expect(controller.findAll()).resolves.toEqual(users);
    expect(findAllPublic).toHaveBeenCalledTimes(1);
  });
});
