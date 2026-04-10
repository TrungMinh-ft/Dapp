import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

const EVM_WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;

@Injectable()
export class WalletAddressPipe implements PipeTransform<string> {
  transform(value: string) {
    const normalized = value?.trim();

    if (!normalized) {
      throw new BadRequestException("wallet query parameter is required.");
    }

    if (!EVM_WALLET_REGEX.test(normalized)) {
      throw new BadRequestException("wallet must be a valid EVM address.");
    }

    return normalized;
  }
}
