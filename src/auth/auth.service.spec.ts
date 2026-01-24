
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Keypair } from '@stellar/stellar-sdk';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
    let service: AuthService;
    let cacheManagerSpec: any;
    let jwtServiceSpec: any;

    const mockCacheStore = new Map();

    beforeEach(async () => {
        mockCacheStore.clear();

        cacheManagerSpec = {
            set: jest.fn().mockImplementation((key, value) => mockCacheStore.set(key, value)),
            get: jest.fn().mockImplementation((key) => mockCacheStore.get(key)),
            del: jest.fn().mockImplementation((key) => mockCacheStore.delete(key)),
        };

        jwtServiceSpec = {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: JwtService,
                    useValue: jwtServiceSpec,
                },
                {
                    provide: CACHE_MANAGER,
                    useValue: cacheManagerSpec,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('generateChallenge', () => {
        it('should generate a challenge and store it', async () => {
            const kp = Keypair.random();
            const result = await service.generateChallenge(kp.publicKey());

            expect(result.message).toContain('Sign this message');
            expect(cacheManagerSpec.set).toHaveBeenCalled();
            expect(mockCacheStore.has(`auth_challenge:${kp.publicKey()}`)).toBeTruthy();
        });
    });

    describe('verifySignature', () => {
        it('should verify valid signature and return token', async () => {
            const kp = Keypair.random();
            const { message } = await service.generateChallenge(kp.publicKey());

            const signature = kp.sign(Buffer.from(message)).toString('base64');

            const result = await service.verifySignature({
                publicKey: kp.publicKey(),
                signature,
                message,
            });

            expect(result.accessToken).toBe('mock-jwt-token');
            expect(jwtServiceSpec.sign).toHaveBeenCalledWith({ sub: kp.publicKey() });
            expect(cacheManagerSpec.del).toHaveBeenCalledWith(`auth_challenge:${kp.publicKey()}`);
        });

        it('should fail with invalid signature', async () => {
            const kp = Keypair.random();
            const { message } = await service.generateChallenge(kp.publicKey());

            const otherKp = Keypair.random();
            const signature = otherKp.sign(Buffer.from(message)).toString('base64');

            await expect(service.verifySignature({
                publicKey: kp.publicKey(),
                signature,
                message,
            })).rejects.toThrow(UnauthorizedException);
        });

        it('should fail if challenge not found/expired', async () => {
            const kp = Keypair.random();
            const message = 'Sign this message...';
            const signature = kp.sign(Buffer.from(message)).toString('base64');

            await expect(service.verifySignature({
                publicKey: kp.publicKey(),
                signature,
                message,
            })).rejects.toThrow(UnauthorizedException);
        });

        it('should fail if message mismatch', async () => {
            const kp = Keypair.random();
            const { message } = await service.generateChallenge(kp.publicKey());

            // Sign the real message
            const signature = kp.sign(Buffer.from(message)).toString('base64');

            // Send a different message in verification DTO
            const fakeMessage = 'fake message';

            await expect(service.verifySignature({
                publicKey: kp.publicKey(),
                message: fakeMessage,
                signature,
            })).rejects.toThrow(UnauthorizedException);
        });
    });
});
