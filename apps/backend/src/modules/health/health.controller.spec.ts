import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { DrizzleHealthIndicator } from './drizzle-health.indicator';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let dbHealthIndicator: jest.Mocked<DrizzleHealthIndicator>;
  let memoryHealthIndicator: jest.Mocked<MemoryHealthIndicator>;

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn(),
    };

    const mockDbHealthIndicator = {
      pingCheck: jest.fn(),
    };

    const mockMemoryHealthIndicator = {
      checkHeap: jest.fn(),
      checkRSS: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: DrizzleHealthIndicator,
          useValue: mockDbHealthIndicator,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemoryHealthIndicator,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
    dbHealthIndicator = module.get(DrizzleHealthIndicator);
    memoryHealthIndicator = module.get(MemoryHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('check', () => {
    it('should return health check status with basic indicators', async () => {
      // Arrange
      const mockHealthResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
        },
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult as any);

      // Act
      const result = await controller.check();

      // Assert
      expect(healthCheckService.check).toHaveBeenCalledTimes(1);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function), // database check
        expect.any(Function), // memory heap check
        expect.any(Function), // memory rss check
      ]);
      expect(result).toEqual(mockHealthResult);
    });

    it('should check database health', async () => {
      // Arrange
      healthCheckService.check.mockImplementation(async (checks) => {
        // Execute the first check (database)
        await checks[0]();
        return {} as any;
      });

      dbHealthIndicator.pingCheck.mockResolvedValue({ database: { status: 'up' } } as any);

      // Act
      await controller.check();

      // Assert
      expect(dbHealthIndicator.pingCheck).toHaveBeenCalledWith('database');
    });

    it('should check memory heap health', async () => {
      // Arrange
      healthCheckService.check.mockImplementation(async (checks) => {
        // Execute the second check (memory heap)
        await checks[1]();
        return {} as any;
      });

      memoryHealthIndicator.checkHeap.mockResolvedValue({ memory_heap: { status: 'up' } } as any);

      // Act
      await controller.check();

      // Assert
      expect(memoryHealthIndicator.checkHeap).toHaveBeenCalledWith('memory_heap', 1024 * 1024 * 1024);
    });

    it('should check memory RSS health', async () => {
      // Arrange
      healthCheckService.check.mockImplementation(async (checks) => {
        // Execute the third check (memory RSS)
        await checks[2]();
        return {} as any;
      });

      memoryHealthIndicator.checkRSS.mockResolvedValue({ memory_rss: { status: 'up' } } as any);

      // Act
      await controller.check();

      // Assert
      expect(memoryHealthIndicator.checkRSS).toHaveBeenCalledWith('memory_rss', 1536 * 1024 * 1024);
    });
  });

  describe('ready', () => {
    it('should check if application is ready', async () => {
      // Arrange
      const mockReadyResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
        },
      };

      healthCheckService.check.mockResolvedValue(mockReadyResult as any);

      // Act
      const result = await controller.ready();

      // Assert
      expect(healthCheckService.check).toHaveBeenCalledTimes(1);
      expect(healthCheckService.check).toHaveBeenCalledWith([expect.any(Function)]);
      expect(result).toEqual(mockReadyResult);
    });

    it('should only check database for readiness', async () => {
      // Arrange
      healthCheckService.check.mockImplementation(async (checks) => {
        expect(checks).toHaveLength(1); // Only database check
        await checks[0]();
        return {} as any;
      });

      dbHealthIndicator.pingCheck.mockResolvedValue({ database: { status: 'up' } } as any);

      // Act
      await controller.ready();

      // Assert
      expect(dbHealthIndicator.pingCheck).toHaveBeenCalledWith('database');
      expect(memoryHealthIndicator.checkHeap).not.toHaveBeenCalled();
      expect(memoryHealthIndicator.checkRSS).not.toHaveBeenCalled();
    });
  });

  describe('alive', () => {
    it('should return simple alive status', () => {
      // Act
      const result = controller.alive();

      // Assert
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThan(0);
    });

    it('should return ISO timestamp', () => {
      // Act
      const result = controller.alive();

      // Assert
      const timestamp = new Date(result.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(result.timestamp);
    });

    it('should not use HealthCheckService for liveness', () => {
      // Act
      controller.alive();

      // Assert
      expect(healthCheckService.check).not.toHaveBeenCalled();
    });
  });
});
