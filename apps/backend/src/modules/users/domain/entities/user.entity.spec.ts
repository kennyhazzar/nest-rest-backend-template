import { User, Users } from './user.entity';

describe('User Entity', () => {
  describe('User.create', () => {
    it('should create a user with provided data', () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'John',
        surname: 'Doe',
        roleId: 'role-uuid-123',
        verified: true,
      };

      // Act
      const user = User.create(userData);

      // Assert
      expect(user).toBeInstanceOf(User);
      expect(user.email).toBe(userData.email);
      expect(user.password).toBe(userData.password);
      expect(user.name).toBe(userData.name);
      expect(user.surname).toBe(userData.surname);
      expect(user.roleId).toBe(userData.roleId);
      expect(user.verified).toBe(userData.verified);
    });

    it('should create a user with partial data', () => {
      // Arrange
      const partialData = {
        email: 'partial@example.com',
        password: 'hashed_password',
      };

      // Act
      const user = User.create(partialData);

      // Assert
      expect(user).toBeInstanceOf(User);
      expect(user.email).toBe(partialData.email);
      expect(user.password).toBe(partialData.password);
    });

    it('should create a user with null/undefined optional fields', () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'John',
        surname: 'Doe',
        middleName: null,
        phone: undefined,
        gender: null,
        birthday: null,
        roleId: 'role-uuid-123',
      };

      // Act
      const user = User.create(userData);

      // Assert
      expect(user).toBeInstanceOf(User);
      expect(user.middleName).toBeNull();
      expect(user.phone).toBeUndefined();
      expect(user.gender).toBeNull();
      expect(user.birthday).toBeNull();
    });

    it('should not mutate original data object', () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'John',
      };
      const originalData = { ...userData };

      // Act
      const user = User.create(userData);
      user.email = 'modified@example.com';

      // Assert
      expect(userData).toEqual(originalData);
    });
  });
});

describe('Users Aggregate', () => {
  describe('Users.create', () => {
    it('should create Users aggregate with provided users and count', () => {
      // Arrange
      const user1 = User.create({ email: 'user1@example.com', password: 'hash1' });
      const user2 = User.create({ email: 'user2@example.com', password: 'hash2' });
      const userArray = [user1, user2];
      const totalCount = 10;

      // Act
      const users = Users.create(userArray, totalCount);

      // Assert
      expect(users).toBeInstanceOf(Users);
      expect(users).toBeInstanceOf(Array);
      expect(users.length).toBe(2);
      expect(users.totalCount).toBe(totalCount);
      expect(users[0]).toBe(user1);
      expect(users[1]).toBe(user2);
    });

    it('should use array length as totalCount if not provided', () => {
      // Arrange
      const user1 = User.create({ email: 'user1@example.com', password: 'hash1' });
      const user2 = User.create({ email: 'user2@example.com', password: 'hash2' });
      const user3 = User.create({ email: 'user3@example.com', password: 'hash3' });
      const userArray = [user1, user2, user3];

      // Act
      const users = Users.create(userArray);

      // Assert
      expect(users.length).toBe(3);
      expect(users.totalCount).toBe(3);
    });

    it('should create empty Users aggregate', () => {
      // Arrange
      const userArray: User[] = [];

      // Act
      const users = Users.create(userArray);

      // Assert
      expect(users).toBeInstanceOf(Users);
      expect(users.length).toBe(0);
      expect(users.totalCount).toBe(0);
    });

    it('should allow totalCount to differ from array length (for pagination)', () => {
      // Arrange
      const user1 = User.create({ email: 'user1@example.com', password: 'hash1' });
      const user2 = User.create({ email: 'user2@example.com', password: 'hash2' });
      const userArray = [user1, user2];
      const totalCount = 100; // Total in database

      // Act
      const users = Users.create(userArray, totalCount);

      // Assert
      expect(users.length).toBe(2); // Current page
      expect(users.totalCount).toBe(100); // Total count
    });

    it('should support array methods', () => {
      // Arrange
      const user1 = User.create({ email: 'user1@example.com', password: 'hash1', name: 'Alice' });
      const user2 = User.create({ email: 'user2@example.com', password: 'hash2', name: 'Bob' });
      const userArray = [user1, user2];

      // Act
      const users = Users.create(userArray, 10);

      // Assert - Test array methods work
      const names = users.map((u) => u.name);
      expect(names).toBeInstanceOf(Array);
      expect(names.length).toBe(2);
      expect(names[0]).toBe('Alice');
      expect(names[1]).toBe('Bob');

      const found = users.find((u) => u.email === 'user1@example.com');
      expect(found).toBe(user1);

      const filtered = users.filter((u) => u.name === 'Bob');
      expect(filtered.length).toBe(1);
      expect(filtered[0]).toBe(user2);
    });
  });
});
