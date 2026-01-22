import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Signal, SignalStatus } from "../../signals/entities/signal.entity";
import { AiValidationService } from "../ai-validation.service";

@Processor("signal-validation")
export class SignalValidationProcessor {
  private readonly logger = new Logger(SignalValidationProcessor.name);

  constructor(
    @InjectRepository(Signal)
    private readonly signalRepository: Repository<Signal>,
    private readonly aiValidationService: AiValidationService,
  ) {}

  @Process("validate")
  async handleValidation(job: Job<{ signalId: string }>) {
    const { signalId } = job.data;
    this.logger.log(`Processing validation for signal ${signalId}`);

    const signal = await this.signalRepository.findOneBy({ id: signalId });
    if (!signal) {
      this.logger.error(`Signal ${signalId} not found`);
      return;
    }

    try {
      const result = await this.aiValidationService.validateSignal(
        signal.assetPair,
        signal.action,
        signal.rationale,
      );

      signal.validationScore = result.score;
      signal.validationFeedback = result.feedback;

      // Logic: Reject signals with score < 30
      if (result.score < 30 || result.isSpam) {
        signal.status = SignalStatus.REJECTED;
        this.logger.warn(`Signal ${signalId} REJECTED with score ${result.score}`);
      } else {
        signal.status = SignalStatus.VALIDATED;
        this.logger.log(`Signal ${signalId} VALIDATED with score ${result.score}`);
      }

      await this.signalRepository.save(signal);
    } catch (error: any) {
      this.logger.error(`Failed to process job ${job.id}: ${error.message}`);
      // If validation fails completely, mark it as FAILED for manual review
      signal.status = SignalStatus.FAILED;
      signal.validationFeedback = `Validation process failed: ${error.message || "Unknown error"}`;
      await this.signalRepository.save(signal);
      throw error; // Rethrow to allow Bull to retry based on configuration
    }
  }
}
