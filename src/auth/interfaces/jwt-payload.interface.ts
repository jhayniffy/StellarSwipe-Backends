
export interface JwtPayload {
    sub: string; // Wallet public key
    iat?: number;
    exp?: number;
}
