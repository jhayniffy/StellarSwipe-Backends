
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifySignatureDto {
    @IsNotEmpty()
    @IsString()
    publicKey!: string;

    @IsNotEmpty()
    @IsString()
    signature!: string;

    @IsNotEmpty()
    @IsString()
    message!: string;
}
